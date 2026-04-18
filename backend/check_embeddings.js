import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

async function checkEmbeddings() {
  try {
    console.log("=== CHECKING EMBEDDING STATUS ===\n");

    // Get all forums
    const { data: allForums, error: allError } = await supabase
      .from("forums")
      .select("id, title, embedding", { count: "exact" });

    if (allError) {
      console.error("Error fetching forums:", allError.message);
      process.exit(1);
    }

    // Count forums with embeddings
    const { data: withEmbeddings, error: withError, count: withCount } = 
      await supabase
        .from("forums")
        .select("id", { count: "exact", head: true })
        .not("embedding", "is", null);

    // Count forums without embeddings (null)
    const { data: nullEmbeddings, error: nullError, count: nullCount } = 
      await supabase
        .from("forums")
        .select("id", { count: "exact", head: true })
        .is("embedding", null);

    console.log("=== EMBEDDING STATISTICS ===");
    console.log("Forums with embeddings:", withCount || 0);
    console.log("Forums without embeddings (null):", nullCount || 0);
    console.log("Total forums:", allForums?.length || 0);
    console.log("");

    // Get a sample embedding
    const { data: sample, error: sampleError } = await supabase
      .from("forums")
      .select("id, title, embedding")
      .not("embedding", "is", null)
      .limit(1)
      .single();

    if (sample && sample.embedding) {
      console.log("=== SAMPLE EMBEDDING ===");
      console.log("Forum ID:", sample.id);
      console.log("Forum Title:", sample.title?.substring(0, 50) + "...");
      console.log("Embedding type:", typeof sample.embedding);
      console.log("Is array:", Array.isArray(sample.embedding));
      
      if (Array.isArray(sample.embedding)) {
        console.log("Array length:", sample.embedding.length);
        console.log("First 5 values:", sample.embedding.slice(0, 5));
        console.log("Data type of first element:", typeof sample.embedding[0]);
      } else {
        const str = JSON.stringify(sample.embedding).substring(0, 150);
        console.log("Embedding value:", str);
      }
    } else {
      console.log("=== SAMPLE EMBEDDING ===");
      console.log("No forums with embeddings found");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

checkEmbeddings();
