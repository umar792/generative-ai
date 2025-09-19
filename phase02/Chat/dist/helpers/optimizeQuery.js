import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
export const optimizeQuery = async (userPrompt) => {
    const llm = new ChatGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY,
        model: "gemini-1.5-flash",
        temperature: 0.3,
    });
    const response = await llm.invoke([
        {
            role: "system",
            content: `You are a query optimizer for semantic search.
      Rewrite the user's input into a clear, concise search query,
      BUT never remove important details or steps from the request.
      Keep technical requirements, tools, frameworks, and actions intact.
      Do not over-summarize.`,
        },
        { role: "user", content: userPrompt },
    ]);
    return response.content;
};
