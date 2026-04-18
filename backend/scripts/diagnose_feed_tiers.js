#!/usr/bin/env node

/**
 * Feed Tier Diagnosis
 * Checks which priority tier each returned forum belongs to
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const userId = process.argv[2];
if (!userId) {
  console.error("Usage: node scripts/diagnose_feed_tiers.js <userId>");
  process.exit(1);
}

async function diagnoseTiers() {
  try {
    console.log(
      `\n╔════════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║  FEED TIER DIAGNOSIS                                       ║`,
    );
    console.log(
      `║  Analyzing which tier each forum should be in              ║`,
    );
    console.log(`║  User ID: ${userId.substring(0, 40).padEnd(40)}║`);
    console.log(
      `╚════════════════════════════════════════════════════════════╝\n`,
    );

    // Get user context
    const { data: subjects } = await supabase
      .from("user_subjects")
      .select("subject_id")
      .eq("user_id", userId);

    const { data: following } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", userId);

    const subjectIds = subjects?.map((s) => s.subject_id) || [];
    const followingIds = following?.map((f) => f.following_id) || [];

    console.log(`User Context:`);
    console.log(`  Followed Subjects: ${subjectIds.join(", ") || "(none)"}`);
    console.log(
      `  Following Users: ${followingIds.slice(0, 3).join(", ")} ${followingIds.length > 3 ? `... (+${followingIds.length - 3} more)` : ""}\n`,
    );

    // The actual forums returned from the endpoint
    const actualForums = [
      { id: "?", title: "Who is Jose rizal", upvotes: 2, comments: 8 },
      {
        id: "?",
        title: "Best Resources for Learning Python?",
        upvotes: 3,
        comments: 4,
      },
      {
        id: "?",
        title: "Need Help with Sorting Algorithm Implementation",
        upvotes: 1,
        comments: 6,
      },
      {
        id: "?",
        title:
          "Help me to understand Algorithm and Logic Formulation Basics to a beginner",
        upvotes: 3,
        comments: 2,
      },
      {
        id: "?",
        title: "how to improve public speaking for presentations",
        upvotes: 2,
        comments: 2,
      },
    ];

    // Get all forums from DB to find the actual subject_id and user_id
    const { data: allForums } = await supabase
      .from("forums")
      .select(
        "id, title, subject_id, user_id, upvotes_count, downvotes_count, comments_count",
      );

    console.log(`📋 ANALYZING ACTUAL RETURNED FORUMS:\n`);

    actualForums.forEach((returnedForum, i) => {
      // Find matching forum in DB
      const dbForum = allForums?.find((f) => f.title === returnedForum.title);

      if (!dbForum) {
        console.log(`${i + 1}. "${returnedForum.title.substring(0, 50)}"`);
        console.log(`   ❌ NOT FOUND IN DATABASE`);
        return;
      }

      // Determine tier
      let tier = "P4";
      let reason = "no match";

      if (subjectIds.includes(dbForum.subject_id)) {
        tier = "P2";
        reason = `subject match: ${dbForum.subject_id}`;
      } else if (followingIds.includes(dbForum.user_id)) {
        tier = "P3";
        reason = `user match: ${dbForum.user_id}`;
      } else {
        tier = "P4";
        reason = "trending/fallback";
      }

      // Calculate engagement
      const engagement =
        (dbForum.upvotes_count || 0) * 2 +
        (dbForum.downvotes_count || 0) * -1 +
        (dbForum.comments_count || 0) * 1.5;

      console.log(`${i + 1}. [${tier}] "${dbForum.title.substring(0, 50)}"`);
      console.log(`   Reason: ${reason}`);
      console.log(
        `   Engagement Score: ${engagement.toFixed(1)} (${dbForum.upvotes_count} upvotes, ${dbForum.comments_count} comments)`,
      );
    });

    console.log(`\n🔍 ANALYSIS:\n`);

    // Count tiers in actual response
    let p2Count = 0;
    let p3Count = 0;
    let p4Count = 0;

    actualForums.forEach((returnedForum) => {
      const dbForum = allForums?.find((f) => f.title === returnedForum.title);
      if (!dbForum) return;

      if (subjectIds.includes(dbForum.subject_id)) p2Count++;
      else if (followingIds.includes(dbForum.user_id)) p3Count++;
      else p4Count++;
    });

    console.log(`Tier Distribution in Response:`);
    console.log(`  P2 (Subjects): ${p2Count} (expected to be first)`);
    console.log(`  P3 (Following): ${p3Count} (expected to be second)`);
    console.log(`  P4 (Trending): ${p4Count} (expected to be last)\n`);

    if (p4Count > 0 && p3Count > 0 && p2Count > 0) {
      // Check if there's interleaving
      const firstP4Index = actualForums.findIndex((f) => {
        const dbForum = allForums?.find((df) => df.title === f.title);
        if (!dbForum) return false;
        return (
          !subjectIds.includes(dbForum.subject_id) &&
          !followingIds.includes(dbForum.user_id)
        );
      });

      const lastP2Index = actualForums.findIndex((f) => {
        const dbForum = allForums?.find((df) => df.title === f.title);
        if (!dbForum) return false;
        return subjectIds.includes(dbForum.subject_id);
      });

      if (firstP4Index > -1 && firstP4Index < actualForums.length - 1) {
        const hasP3After = actualForums.some((f, idx) => {
          if (idx <= firstP4Index) return false;
          const dbForum = allForums?.find((df) => df.title === f.title);
          if (!dbForum) return false;
          return (
            followingIds.includes(dbForum.user_id) &&
            !subjectIds.includes(dbForum.subject_id)
          );
        });

        if (hasP3After) {
          console.log(`❌ TIER INTERLEAVING DETECTED!`);
          console.log(`   P4 forum appears at position ${firstP4Index + 1}`);
          console.log(`   But P3 forums appear after it`);
          console.log(`   → Priority ordering is BROKEN\n`);
        }
      }
    }

    if (p4Count > 0 && p3Count === 0 && p2Count > 0) {
      console.log(`⚠️  P3 FORUMS MISSING`);
      console.log(`   Should have P3 forums between P2 and P4`);
      console.log(`   But only P2 and P4 are returned\n`);
    }

    if (p2Count === 0) {
      console.log(`❌ NO P2 FORUMS`);
      console.log(`   First forum should be from followed subjects\n`);
    }

    if (
      p2Count > 0 &&
      p3Count > 0 &&
      p4Count > 0 &&
      actualForums[0] &&
      subjectIds.includes(
        allForums?.find((f) => f.title === actualForums[0].title)?.subject_id,
      )
    ) {
      console.log(`✅ TIER ORDERING IS CORRECT`);
      console.log(`   Forums are properly sorted: P2 → P3 → P4\n`);
    }

    // Calculate engagement scores within each tier
    console.log(`📊 ENGAGEMENT SCORES BY TIER:\n`);

    const p2Engagement = [];
    const p3Engagement = [];
    const p4Engagement = [];

    actualForums.forEach((returnedForum) => {
      const dbForum = allForums?.find((f) => f.title === returnedForum.title);
      if (!dbForum) return;

      const engagement =
        (dbForum.upvotes_count || 0) * 2 +
        (dbForum.downvotes_count || 0) * -1 +
        (dbForum.comments_count || 0) * 1.5;

      if (subjectIds.includes(dbForum.subject_id)) {
        p2Engagement.push({
          title: dbForum.title.substring(0, 40),
          score: engagement,
        });
      } else if (followingIds.includes(dbForum.user_id)) {
        p3Engagement.push({
          title: dbForum.title.substring(0, 40),
          score: engagement,
        });
      } else {
        p4Engagement.push({
          title: dbForum.title.substring(0, 40),
          score: engagement,
        });
      }
    });

    if (p2Engagement.length > 0) {
      console.log(`P2 (Subjects):`);
      p2Engagement.forEach((f) =>
        console.log(`  - ${f.score.toFixed(1)}: ${f.title}`),
      );
    }

    if (p3Engagement.length > 0) {
      console.log(`\nP3 (Following Users):`);
      p3Engagement.forEach((f) =>
        console.log(`  - ${f.score.toFixed(1)}: ${f.title}`),
      );
    }

    if (p4Engagement.length > 0) {
      console.log(`\nP4 (Trending):`);
      p4Engagement.forEach((f) =>
        console.log(`  - ${f.score.toFixed(1)}: ${f.title}`),
      );
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

diagnoseTiers();
