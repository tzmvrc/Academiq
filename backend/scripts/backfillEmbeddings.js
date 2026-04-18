import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { generateForumEmbedding } from "../app/utils/embedding_service.js";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

const BATCH_SIZE = parseInt(process.env.EMBEDDING_BATCH_SIZE || "10", 10);
const DELAY_MS = parseInt(process.env.EMBEDDING_DELAY_MS || "500", 10);

/**
 * Backfill embeddings for all forums where embedding IS NULL
 */
async function backfillEmbeddings() {
  console.log(
    `\n🚀 Starting embedding backfill (batch size: ${BATCH_SIZE}, delay: ${DELAY_MS}ms)\n`,
  );

  let totalProcessed = 0;
  let totalErrors = 0;
  let batchCount = 0;
  let emptyBatchCount = 0; // Track consecutive empty batches

  while (emptyBatchCount < 2) {
    // Stop after 2 consecutive empty batches
    batchCount++;
    console.log(
      `\n📦 Batch ${batchCount}: Fetching forums without embeddings...`,
    );

    // Fetch forums without embeddings - only NULL values
    const { data: forums, error: fetchError } = await supabase
      .from("forums")
      .select("id, title, content")
      .is("embedding", null)
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error(`❌ Error fetching forums: ${fetchError.message}`);
      return;
    }

    if (!forums || forums.length === 0) {
      emptyBatchCount++;
      console.log(`   Found 0 forums (empty batch ${emptyBatchCount}/2)\n`);
      if (emptyBatchCount >= 2) {
        console.log(
          `\n✅ Backfill complete! Total processed: ${totalProcessed}`,
        );
        console.log(`Total errors: ${totalErrors}\n`);
        return;
      }
      // Wait and try again
      await new Promise((r) => setTimeout(r, DELAY_MS * 2));
      continue;
    }

    // Reset empty batch counter when we find forums
    emptyBatchCount = 0;
    console.log(`   Found ${forums.length} forums to embed\n`);

    // Process each forum
    let batchProcessed = 0;
    for (let i = 0; i < forums.length; i++) {
      const forum = forums[i];

      try {
        // Skip if no content
        if (!forum.title && !forum.content) {
          console.log(`   ⏭️  Skipped ${forum.id}: no title/content`);
          continue;
        }

        // Generate embedding
        console.log(
          `   ⏳ [${i + 1}/${forums.length}] Generating embedding for ${forum.id}...`,
        );
        const embedding = await generateForumEmbedding(
          forum.title || "",
          forum.content || "",
        );

        // Save to database
        const { error: updateError } = await supabase
          .from("forums")
          .update({ embedding })
          .eq("id", forum.id);

        if (updateError) {
          throw new Error(updateError.message);
        }

        console.log(`   ✅ [${i + 1}/${forums.length}] Embedded ${forum.id}`);
        totalProcessed++;
        batchProcessed++;

        // Add delay to avoid rate limiting
        if (i < forums.length - 1) {
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
      } catch (err) {
        console.error(
          `   ❌ [${i + 1}/${forums.length}] Failed for ${forum.id}: ${err.message}`,
        );
        totalErrors++;
      }
    }

    console.log(
      `\n✅ Batch ${batchCount} complete (processed: ${batchProcessed}, total errors: ${totalErrors})`,
    );

    // Add delay between batches
    console.log(`⏳ Waiting ${DELAY_MS * 2}ms before next batch...\n`);
    await new Promise((r) => setTimeout(r, DELAY_MS * 2));
  }
}

// Run backfill
backfillEmbeddings().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
