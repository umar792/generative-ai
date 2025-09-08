import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.KEY });
const generatePrompt = async (prompt) => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "Explain how AI works",
        config: {
            temperature: 0.1,
        },
    });
    console.log(response.text);
};
generatePrompt("hello");
