import express from "express";
import cors from "cors";
import multer from "multer";

import { pdfQueue } from "./queue.js";
import { qdrantClient } from "./qdrant.js";

import {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} from "@langchain/google-genai";
import { QdrantVectorStore } from "@langchain/qdrant";

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- Multer Setup ---------- */

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

/* ---------- Routes ---------- */

app.get("/", (req, res) => {
  res.json({ status: "Server running" });
});

/* Upload PDF */
app.post("/upload/pdf", upload.single("pdf"), async (req, res) => {
  const { userId } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "No PDF uploaded" });
  }

  try {
    const job = await pdfQueue.add("process-pdf", {
      path: req.file.path,
      filename: req.file.filename,
      userId: userId || null,
    });

    res.json({
      message: "PDF queued for processing",
      jobId: job.id,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to queue PDF",
      error: error.message,
    });
  }
});

/* Chat Endpoint (RAG) */
app.post("/chat", async (req, res) => {
  try {
    const { question, userId } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Missing question" });
    }

    const embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "gemini-embedding-001",
    });

    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        client: qdrantClient,
        collectionName: "documents",
      },
    );

    const searchOptions = userId
      ? {
          filter: {
            must: [{ key: "userId", match: { value: userId } }],
          },
        }
      : undefined;

    const results = await vectorStore.similaritySearch(
      question,
      4,
      searchOptions,
    );

    if (results.length === 0) {
      return res.json({
        answer: "No relevant documents found for this query.",
      });
    }

    const context = results.map((r) => r.pageContent).join("\n");
    console.log("Context for question:", context);
    const model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_API_KEY,
      model: "gemini-2.5-flash",
    });

    const response = await model.invoke(`
You are a helpful assistant. Answer the question based on the provided context.

Context:
${context}

Question: ${question}

Answer:
    `);

    res.json({ answer: response.content });
  } catch (error) {
    res.status(500).json({
      message: "Chat failed",
      error: error.message,
    });
  }
});

app.listen(process.env.PORT || 8000, () =>
  console.log(`Server running on port ${process.env.PORT || 8000}`),
);
