
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GEMINI_MODEL_TEXT } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn(
    "API_KEY environment variable not set. The application may not function correctly."
  );
  // Depending on strictness, you might throw an error here:
  // throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! }); // Assume API_KEY is present based on instructions

export async function generateText(prompt: string): Promise<string> {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API (generateText) Error:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("Unknown Gemini API error occurred during text generation.");
  }
}

export async function generateTextStream(prompt: string) {
  try {
    return await ai.models.generateContentStream({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
    });
  } catch (error) {
    console.error("Gemini API (generateTextStream) Error:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("Unknown Gemini API error occurred during text generation stream.");
  }
}

export async function generateJson<T,>(prompt: string): Promise<T> {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    try {
      return JSON.parse(jsonStr) as T;
    } catch (e) {
      console.error("Failed to parse JSON response from Gemini:", e, "Raw text:", response.text);
      throw new Error(`Failed to parse JSON from AI response. Ensure the model returns valid JSON. Raw output: "${response.text}"`);
    }
  } catch (error) {
    console.error("Gemini API (generateJson) Error:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("Unknown Gemini API error occurred during JSON generation.");
  }
}