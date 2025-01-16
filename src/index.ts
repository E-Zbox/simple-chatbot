import { config } from "dotenv";
// .env
config({ path: `.env.${process.env.NODE_ENV}` });
import { readFileSync } from "fs";
import OpenAI from "openai";
import * as readline from "readline/promises";
// api
import {
  sendMessage,
  MESSAGE_TYPE_DETAILED_EXPLANATION,
  MESSAGE_TYPE_IDEA_GENERATION,
} from "./api";
// utils
import {
  createQuestion,
  getUserSelection,
  parseIdeasFromTag,
} from "./utils/generator";

const readlineInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let instruction: null | string = null;

async function main(printManual = true) {
  if (instruction == null) {
    const data = readFileSync(`${__dirname}/manual.txt`, "utf8");

    instruction = data;
  }

  if (printManual) {
    console.log(instruction);
  } else {
    console.log("...\nstarting over");
  }

  // 1. get user's input
  let query: string = await createQuestion(
    readlineInterface,
    "Paste your query below",
    "string"
  );

  // 2. generate 3 unique ideas from user's input
  let sendMessageResponse = await sendMessage(
    query,
    MESSAGE_TYPE_IDEA_GENERATION
  );

  if (!sendMessageResponse.success) {
    console.log(sendMessageResponse.error);
    return main((printManual = false));
  }

  // 3. parse the generated ideas
  let [idea, lastMessage] = sendMessageResponse.data;
  let parsedIdeasResponse = parseIdeasFromTag(idea);

  if (!parsedIdeasResponse.success) {
    console.log(parsedIdeasResponse.error);
    return main((printManual = false));
  }

  const chatHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: [
        {
          text: lastMessage,
          type: "text",
        },
      ],
    },
    {
      role: "assistant",
      content: [
        {
          text: parsedIdeasResponse.data,
          type: "text",
        },
      ],
    },
  ];

  // 4. prompt user to pick an idea
  let explainRanking = false;
  let unlocked = false;
  let userSelection: number[] = [];

  while (!unlocked) {
    query = await createQuestion(
      readlineInterface,
      `To select from the ranked list, please choose 2 ideas by typing numbers (e.g '1 and 3') \n-----------OR-----------\nTo request an explanation for why a specific idea was given priority score, type "EXPLAIN"\n${parsedIdeasResponse.data}`,
      "string"
    );

    if (query.toLowerCase().replaceAll(" ", "") == "explain") {
      explainRanking = true;

      const sendMessageResponse = await sendMessage(
        "Explain ranking",
        "",
        chatHistory
      );

      if (!sendMessageResponse.success) {
        console.log(sendMessageResponse.error);
        continue;
      }

      const [idea, lastMessage] = sendMessageResponse.data;

      console.log(idea);
    } else {
      const { data, error, success } = getUserSelection(query);

      if (!success) {
        console.log(error);
      } else {
        userSelection = data;
        unlocked = true;
      }
    }
  }

  // 5. give detailed suggestion for each of the chosen ideas
  sendMessageResponse = await sendMessage(
    userSelection.join(", "),
    MESSAGE_TYPE_DETAILED_EXPLANATION,
    chatHistory
  );

  if (!sendMessageResponse.success) {
    console.log(sendMessageResponse.error);
    return main((printManual = false));
  }

  // 6. return the result to the user
  [idea, lastMessage] = sendMessageResponse.data;
  console.log(idea.replaceAll("<idea>", "\n\t\t").replaceAll("</idea>", "\n"));
}

main();
