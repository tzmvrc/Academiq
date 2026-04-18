import { supabase } from "../../database/supabase.js";

const ACTION_WEIGHTS = {
  upvote: 1.0,
  comment: 0.8,
  save: 0.6,
  view: 0.3,
  downvote: -0.2, // optional: negative feedback
};

// Helper to parse embedding from pgvector (string) to array
function parseEmbedding(embedding) {
  if (!embedding) return null;
  if (Array.isArray(embedding)) return embedding;
  if (typeof embedding === "string") {
    try {
      // pgvector returns strings like '[0.1,0.2,...]'
      return JSON.parse(embedding);
    } catch {
      return null;
    }
  }
  return null;
}

export async function computeUserInterestVector(userId) {
  console.log("🚀 computeUserInterestVector called for user", userId);

  // Fetch user's activities in last 30 MINUTES, join with forum embeddings
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: activities, error } = await supabase
    .from("user_activity")
    .select(
      `
      action_type,
      forum_id,
      forums (
        embedding,
        upvotes_count,
        comments_count
      )
    `,
    )
    .eq("user_id", userId)
    .gte("created_at", thirtyMinutesAgo);

  if (error) {
    console.error("❌ Error fetching activities:", error);
    return null;
  }

  console.log(
    `📊 Found ${activities?.length || 0} total activities in last 30 minutes`,
  );

  if (!activities || activities.length < 3) {
    console.log(
      `❌ Not enough activities (need 3), got ${activities?.length || 0}`,
    );
    return null;
  }

  // Filter activities where forum has embedding (after parsing)
  const validActivities = [];
  for (const act of activities) {
    if (!act.forums) continue;
    const rawEmbedding = act.forums.embedding;
    const embedding = parseEmbedding(rawEmbedding);
    if (embedding && embedding.length === 1536) {
      // Store the parsed embedding back for later use
      act.parsedEmbedding = embedding;
      validActivities.push(act);
    } else {
      console.log(`Skipping forum ${act.forum_id} – invalid embedding`);
    }
  }
  console.log(`✅ Activities with valid embedding: ${validActivities.length}`);

  if (validActivities.length < 3) {
    console.log(
      `❌ Not enough valid activities (need 3), got ${validActivities.length}`,
    );
    return null;
  }

  let weightedSum = null;
  let totalWeight = 0;
  let processedCount = 0;

  for (const act of validActivities) {
    console.log(
      `Processing activity: type=${act.action_type}, forum_id=${act.forum_id}`,
    );

    const embedding = act.parsedEmbedding;
    console.log(
      `Embedding type: ${typeof embedding}, isArray: ${Array.isArray(embedding)}, length: ${embedding?.length}`,
    );

    let weight = ACTION_WEIGHTS[act.action_type] || 0.1;
    if (weight <= 0) {
      console.log(`Skipping – weight <= 0: ${weight}`);
      continue;
    }

    const engagement =
      (act.forums.upvotes_count || 0) + (act.forums.comments_count || 0);
    const boost = 1 + Math.min(0.5, engagement / 100);
    const finalWeight = weight * boost;
    console.log(
      `Weight: ${weight}, boost: ${boost}, finalWeight: ${finalWeight}`,
    );

    if (!weightedSum) {
      weightedSum = embedding.map((v) => v * finalWeight);
      console.log(`Initialized weightedSum with length ${weightedSum.length}`);
    } else {
      for (let i = 0; i < embedding.length; i++) {
        weightedSum[i] += embedding[i] * finalWeight;
      }
    }
    totalWeight += finalWeight;
    processedCount++;
    console.log(
      `Processed activity ${processedCount}, totalWeight now ${totalWeight}`,
    );
  }

  console.log(
    `Loop finished. Processed ${processedCount} activities, weightedSum = ${!!weightedSum}, totalWeight = ${totalWeight}`,
  );

  if (!weightedSum) {
    console.log(`❌ No weightedSum computed – cannot create interest vector`);
    return null;
  }

  const interestVector = weightedSum.map((v) => v / totalWeight);

  // Store in database - delete old if exists, then insert new
  try {
    // First try to delete any existing record
    await supabase.from("user_interest_vectors").delete().eq("user_id", userId);

    // Then insert the new record
    const { error: insertError } = await supabase
      .from("user_interest_vectors")
      .insert({
        user_id: userId,
        interest_vector: interestVector,
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("❌ Failed to store interest vector:", insertError);
      return null;
    }

    console.log(`✅ Stored interest vector for user ${userId}`);
    return interestVector;
  } catch (err) {
    console.error("❌ Error storing interest vector:", err);
    return null;
  }
}
