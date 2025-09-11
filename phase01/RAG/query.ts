import readlineSync from "readline-sync";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

interface History {
    role: string;
    parts : {
        text?:string,
        functionCall?:any,
        functionResponse?:any
    }[]
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const History:History[] = [];

async function chatting(userProblem: string) {
  // convert userProblem to vector
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "text-embedding-004",
  });

  const queryVector = await embeddings.embedQuery(userProblem);
  const pinecone = new Pinecone();
  const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME!);

  const searchResults = await pineconeIndex.query({
    topK: 10,
    vector: queryVector,
    includeMetadata: true,
  });

  const context = searchResults.matches
    .map((match) => match?.metadata?.text)
    .join("\n\n---\n\n");
    History.push({
        role: "user",
        parts: [{ text: userProblem }],
      });

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: History,
    config: {
      systemInstruction: `You have to behave like a Data Structure and Algorithm Expert.
                        You will be given a context of relevant information and a user question.
                        Your task is to answer the user's question based ONLY on the provided context.
                        If the answer is not in the context, you must say "I could not find the answer in the provided document."
                        Keep your answers clear, concise, and educational.
                        Context: ${context}
        `,
    },
  });

  History.push({
    role: "model",
    parts: [{ text: response.text }],
  });

  console.log("\n");
  console.log(response.text);
}

async function main() {
  const userProblem = readlineSync.question("Ask me anything--> ");
  await chatting(userProblem);
  main();
}

main();
