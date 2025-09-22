import fs from "fs";
import dotenv from "dotenv";
import { CharacterTextSplitter } from "langchain/text_splitter";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import path from "path"
import { fileURLToPath } from "url";


dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log(path.join(__dirname, "prompts", "Nodejs.txt"))
const vectorEmbedding = async () => {
  const text = fs.readFileSync(path.join(__dirname, "../" ,"Prompts", "Nodejs.txt"), "utf-8");

  const textSplitter = new CharacterTextSplitter({
    chunkSize: 200,
    chunkOverlap: 50,
  });
  const chunks = await textSplitter.splitText(text);
  console.log("Loaded chunks:", chunks.length);

  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "text-embedding-004",
  });

  const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
  });

  const indexName = process.env.nodejs!;
  console.log("Using Pinecone index:", indexName);

  const pineconeIndex = pinecone.Index(indexName);

  await PineconeStore.fromTexts(
    chunks,
    chunks.map((_, i) => ({ chunkId: i, source: "backend_assistant_knowledge.txt" })),
    embeddings,
    { pineconeIndex } // <- MUST be defined
  );

  console.log("Knowledge file indexed in Pinecone ✅");
};

vectorEmbedding();
