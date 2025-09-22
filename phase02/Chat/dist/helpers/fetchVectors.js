import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone } from "@pinecone-database/pinecone";
export const fetchVectors = async (optimizePrompt) => {
    const embedding = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        model: "text-embedding-004",
    });
    // convert optimizePrompt into vector
    const queryVector = await embedding.embedQuery(optimizePrompt);
    //connect pinecone
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const pineconeIndex = pinecone.Index(process.env.nodejs);
    const result = await pineconeIndex.query({
        topK: 3,
        vector: queryVector,
        includeMetadata: true,
    });
    // get metaData
    const resultMetaData = result.matches.map((item) => item.metadata.text);
    return resultMetaData.join("\n\n");
};
