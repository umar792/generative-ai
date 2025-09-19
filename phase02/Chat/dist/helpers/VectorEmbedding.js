import fs from "fs";
import dotenv from "dotenv";
import { CharacterTextSplitter } from "langchain/text_splitter";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
dotenv.config();
const vectorEmbedding = async () => {
    const text = fs.readFileSync("backend_assistant_knowledge.txt", "utf-8");
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
        apiKey: process.env.PINECONE_API_KEY,
    });
    const indexName = process.env.PINECONE_INDEX_NAME;
    console.log("Using Pinecone index:", indexName);
    const pineconeIndex = pinecone.Index(indexName);
    await PineconeStore.fromTexts(chunks, chunks.map((_, i) => ({ chunkId: i, source: "backend_assistant_knowledge.txt" })), embeddings, { pineconeIndex } // <- MUST be defined
    );
    console.log("Knowledge file indexed in Pinecone ✅");
};
// vectorEmbedding();
