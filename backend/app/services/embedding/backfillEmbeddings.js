// backend/app/services/embedding/backfillEmbeddings.js (or any path)
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the backend root (two levels up from app/services/embedding)
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { supabase } from "../../database/supabase.js";
import { generateForumEmbedding } from "./embeddingService.js";

async function backfill() {
  console.log("Starting backfill...");
  const { data: forums, error } = await supabase
    .from("forums")
    .select("id, title, content")
    .is("embedding", null)
    .limit(100);

  if (error) throw error;
  console.log(`Found ${forums.length} forums without embeddings`);

  for (const forum of forums) {
    console.log(`Processing forum ${forum.id}: ${forum.title}`);
    const embedding = await generateForumEmbedding(forum.title, forum.content);
    if (embedding) {
      const { error: updateErr } = await supabase
        .from("forums")
        .update({ embedding })
        .eq("id", forum.id);
      if (updateErr) console.error(`Failed to update ${forum.id}:`, updateErr);
      else console.log(`✅ Embedded forum ${forum.id}`);
    } else {
      console.log(`❌ Failed to generate embedding for forum ${forum.id}`);
    }
  }
  console.log("Backfill complete.");
}

backfill();
