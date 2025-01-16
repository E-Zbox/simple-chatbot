import { mkdirSync, writeFileSync } from "fs";
import { OpenAI } from "openai";
import { IResponse } from "./interface";
import { join } from "path";

const { HF_ACCESS_TOKEN, HF_BASE_URL } = process.env;

const client = new OpenAI({
  apiKey: HF_ACCESS_TOKEN,
  baseURL: HF_BASE_URL,
});

export const MESSAGE_TYPE_IDEA_GENERATION = "IDEA_GENERATION";
export const MESSAGE_TYPE_DETAILED_EXPLANATION = "DETAILED_EXPLANATION";

export const sendMessage = async (
  query: string,
  messageType: string,
  chatHistory:
    | OpenAI.Chat.Completions.ChatCompletionMessageParam[]
    | null = null
): Promise<IResponse<[string, string]>> => {
  let response: IResponse<[string, string]> = {
    data: ["", ""],
    error: "",
    success: false,
  };

  try {
    let developerInstruction = "";
    if (messageType == MESSAGE_TYPE_IDEA_GENERATION) {
      // Adhere strictly to the instruction in <master> tags.<master>
      developerInstruction =
        "Generate in list format 3 unique ideas and wrap each one in <idea> </idea> tag. Also, generate a rating with no explanation for now, for each each idea based on how close it aligns with the original user query, the significance or expected ROI for each idea, and how easily the idea can be acted upon, with a ranking score (1 - 5 where 1 is the highest priority). Wrap the ranking number in square bracket so that it can be easily matched";
    }
    if (messageType == MESSAGE_TYPE_DETAILED_EXPLANATION) {
      developerInstruction =
        "I refactored your response to be in a numbered list format. Give detailed suggestions for the (2) comma separated selected ideas and wrap each detailed suggestion in <idea></idea> tag";
    }

    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (chatHistory !== null) {
      messages = [...messages, ...chatHistory];
    }

    messages.push({
      content: [
        {
          text: `${developerInstruction}${query}`,
          type: "text",
        },
      ],
      role: "user",
      // store: true
    });

    const result = await client.chat.completions.create({
      messages,
      model: "google/gemma-2-2b-it",
    });

    if (!result.choices[0].message.content) {
      throw new Error("No content generated. Please try a different query");
    }

    // save generated content to logs directory for research and debugging purposes
    mkdirSync("logs", { recursive: true });

    writeFileSync(
      join(
        __dirname,
        `logs/${Date.now()}-${query
          .substring(0, 20)
          .trim()
          .replaceAll(" ", "-")}.json`
      ),
      JSON.stringify({ QUERY: query, ...result }),
      "utf-8"
    );

    response = {
      data: [
        result.choices[0].message.content!,
        `${developerInstruction}${query}`,
      ],
      error: "",
      success: true,
    };
  } catch (error: any) {
    if (
      typeof error == "object" &&
      error.message.includes("Connection error")
    ) {
      error = "Please check your internet connection and try again!";
    }
    response = {
      ...response,
      error: `${error}`,
    };
  } finally {
    return response;
  }
};
