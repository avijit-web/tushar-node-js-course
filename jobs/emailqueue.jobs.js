import { Queue, Worker } from "bullmq";
import { redisConnection } from "../config/queue.js";
import logger from "../config/logger.js";

export const emailQueueName = "email-queue";

export const emailQueue = new Queue(emailQueueName, {
  connection: redisConnection,
  defaultJobOptions: {
    delay: 5000,
    removeOnComplete: {
      count: 100,
      age: 60 * 60 * 24,
    },
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

export const handler = new Worker(
  emailQueueName,
  async (job) => {
    console.log("the email worker data is", job.data);
  },
  {
    connection: redisConnection,
  },
);

handler.on("completed", (job) => {
  logger.info({ job: job.id, message: "Job completed" });
  console.log(`the job ${job.id} is complete`);
});

handler.on("failed", (job) => {
  console.log(`the job ${job.id} is failed`);
});
