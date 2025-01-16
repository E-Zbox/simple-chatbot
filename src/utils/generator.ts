import { IResponse } from "@/api/interface";
import * as readline from "readline/promises";

export const createQuestion = async (
  readline: readline.Interface,
  text: string,
  expectedType: string
): Promise<any> => {
  let question = `${text}\n>> `;
  let answer = await readline.question(question);

  if (expectedType === "number" && !Number(answer)) {
    console.log(`'${answer}' does not match expected type`);
    return createQuestion(readline, text, expectedType);
  }

  return expectedType == "number" ? Number(answer) : answer;
};

export const createChatCompletion = (
  role: "assistant" | "user" = "user",
  text: string
) => {
  return {
    content: [
      {
        text,
        type: "text",
      },
    ],
    role,
  };
};

export const parseIdeasFromTag = (content: string): IResponse<string> => {
  let response: IResponse<string> = {
    data: "",
    error: "",
    success: false,
  };

  let ideaTagFound = content.match(/<idea>([\s\S]*?)<\/idea>/g); // /<idea>(.*?)<\/idea>/g

  if (!ideaTagFound) {
    response = {
      ...response,
      error: "No ideas generated",
    };
  } else {
    let ideaArray = ideaTagFound.map((text) =>
      text.replaceAll("<idea>", "").replaceAll("</idea>", "")
    );

    let data = "";

    ideaArray.forEach((text, index) => {
      data = `${data}${index + 1}.) ${text}${
        index < ideaArray.length - 1 ? "\n" : ""
      }`;
    });

    response = {
      data,
      error: "",
      success: true,
    };
  }

  return response;
};

export const getUserSelection = (
  text: string,
  maximumSelection = 2
): IResponse<number[]> => {
  let response: IResponse<number[]> = {
    data: [],
    error: "",
    success: false,
  };

  const data = text
    .split(/[,\s]+/)
    .map((num) => parseInt(num.trim()))
    .filter((num) => num >= 1 && num <= 3);

  if (data.length !== maximumSelection) {
    response = {
      ...response,
      error: "Please select exactly two ideas.",
    };
  } else {
    response = {
      data,
      error: "",
      success: true,
    };
  }

  return response;
};
