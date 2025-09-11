import dotenv from "dotenv";
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
dotenv.config();


const indexDocuments = async ()=>{

    const docPath = "./Dsa.pdf";
    const loader = new PDFLoader(docPath)
    const rawDocs = await loader.load();
    console.log("PDF loaded");

    // chunk into smaller pieces
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap:200,
    });
    const chunkedDocs = await textSplitter.splitDocuments(rawDocs);
    console.log("PDF chunked");

    // vector embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GEMINI_API_KEY,
        model: 'text-embedding-004',
    });

    // Initialize Pinecone Client
    const pinecone = new Pinecone();
    const pineconeIndex = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
    console.log("Pinecone initialized");

    //  Embed Chunks and Upload to Pinecone
    await PineconeStore.fromDocuments(chunkedDocs, embeddings, {
        pineconeIndex,
        maxConcurrency: 5,
    });
    console.log("PDF indexed in Pinecone");



} 

indexDocuments()