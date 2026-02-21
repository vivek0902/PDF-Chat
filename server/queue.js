import { Queue } from "bullmq";
import { redisConnection } from "./redis.js";

export const pdfQueue = new Queue("pdf-processing", {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});
