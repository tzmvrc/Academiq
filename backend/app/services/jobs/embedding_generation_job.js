// services/jobs/embedding_generation_job.js
// Background job for generating embeddings for forums that don't have them

import { ForumModel } from "../../models/forum_model.js";
import { generateForumEmbedding } from "../embedding/embeddingService.js";

/**
 * Process forums without embeddings (batch job)
 * Run this periodically to generate embeddings for all approved forums
 * @param {number} batchSize - Number of forums to process per batch
 * @param {number} delayMs - Delay between batches (to avoid rate limiting)
 */
export const processForumsWithoutEmbeddings = async (
  batchSize = 10,
  delayMs = 500,
) => {
  console.log(
    `🔄 Starting embedding generation job (batch size: ${batchSize})`,
  );

  let totalProcessed = 0;
  let totalFailed = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      // Fetch next batch of forums without embeddings
      const forums = await ForumModel.getForumsWithoutEmbeddings(batchSize);

      if (forums.length === 0) {
        hasMore = false;
        console.log(`✅ All forums processed. Total: ${totalProcessed}`);
        break;
      }

      // Process each forum
      for (const forum of forums) {
        try {
          console.log(`⏳ Generating embedding for forum ${forum.id}...`);
          const embedding = await generateForumEmbedding(
            forum.title,
            forum.content,
          );

          if (embedding) {
            await ForumModel.saveEmbedding(forum.id, embedding);
            console.log(`✅ Embedding saved for forum ${forum.id}`);
            totalProcessed++;
          } else {
            console.warn(
              `⚠️ Failed to generate embedding for forum ${forum.id}`,
            );
            totalFailed++;
          }
        } catch (err) {
          console.error(`❌ Error processing forum ${forum.id}:`, err);
          totalFailed++;
        }
      }

      // Delay before next batch
      if (forums.length === batchSize) {
        console.log(`⏳ Waiting ${delayMs}ms before next batch...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        hasMore = false;
      }
    } catch (err) {
      console.error("❌ Embedding generation job error:", err);
      hasMore = false;
    }
  }

  console.log(
    `📊 Job complete - Processed: ${totalProcessed}, Failed: ${totalFailed}`,
  );
  return { processed: totalProcessed, failed: totalFailed };
};

/**
 * Scheduled job entry point (for use with node-cron or similar)
 */
export const embeddingGenerationJobScheduled = async () => {
  console.log("🕐 Running scheduled embedding generation job");
  try {
    await processForumsWithoutEmbeddings(5, 1000); // Batch of 5, 1s delay
  } catch (err) {
    console.error("Scheduled embedding job failed:", err);
  }
};
