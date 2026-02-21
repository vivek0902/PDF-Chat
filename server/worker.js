import { Worker } from "bullmq";
import { readFile } from "node:fs/promises";
import { redisConnection } from "./redis.js";
import { qdrantClient } from "./qdrant.js";

import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";

const worker = new Worker(
  "pdf-processing",
  async (job) => {
    const { path, filename, userId } = job.data;

    console.log(`Processing: ${filename}`);

    /* 1️⃣ Load PDF with pdf-parse v2 */
    const fileBuffer = await readFile(path);
    const parser = new PDFParse({ data: fileBuffer });
    const parsed = await parser.getText();
    await parser.destroy();

    /* 2️⃣ Chunk */
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 200,
      chunkOverlap: 100,
    });

    const docsWithMeta = await splitter.createDocuments(
      [parsed.text || ""],
      [
        {
          userId,
          filename,
          path,
        },
      ],
    );

    /* 3️⃣ Embed */
    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "gemini-embedding-001",
    });

    /* 4️⃣ Store */
    await QdrantVectorStore.fromDocuments(docsWithMeta, embeddings, {
      client: qdrantClient,
      collectionName: "documents",
    });

    console.log(`Completed: ${filename}`);

    return { success: true, chunks: docsWithMeta.length };
  },
  {
    connection: redisConnection,
  },
);

worker.on("completed", (job, result) => {
  console.log("Job completed:", job.id, result);
});

worker.on("failed", (job, err) => {
  console.error("Job failed:", job?.id, err.message);
});

console.log("Worker running...");
