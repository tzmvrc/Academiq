import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

async function checkEmbeddingDetails() {
  try {
    // Get a sample embedding with full details
    const { data: sample, error: sampleError } = await supabase
      .from("forums")
      .select("id, title, embedding")
      .not("embedding", "is", null)
      .limit(1)
      .single();

    if (sample && sample.embedding) {
      console.log("=== EMBEDDING STRUCTURE ANALYSIS ===\n");
      console.log("Raw embedding (full string):");
      console.log(sample.embedding);
      console.log("\nLength of embedding string:", sample.embedding.length);
      
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(sample.embedding);
        console.log("\n✓ Successfully parsed as JSON");
        console.log("Parsed type:", typeof parsed);
        console.log("Is array:", Array.isArray(parsed));
        
        if (Array.isArray(parsed)) {
          console.log("Array length:", parsed.length);
          console.log("Element type:", typeof parsed[0]);
          console.log("First 10 elements:", parsed.slice(0, 10));
          console.log("Last 5 elements:", parsed.slice(-5));
        }
      } catch (e) {
        console.log("\n✗ Not valid JSON, treating as raw string");
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkEmbeddingDetails();
