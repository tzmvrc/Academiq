#!/usr/bin/env node

/**
 * Feed Integration Test
 * Tests the complete feed categorization flow without needing authentication
 * Simulates what the feed controller does at each step
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
  console.error("Usage: node scripts/test_feed_integration.js <userId>");
  process.exit(1);
}

async function testFeedIntegration() {
  try {
    console.log(
      `\n╔════════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║  FEED INTEGRATION TEST                                     ║`,
    );
    console.log(
      `║  Simulating complete feed controller flow                  ║`,
    );
    console.log(`║  User ID: ${userId.substring(0, 40).padEnd(40)}║`);
    console.log(
      `╚════════════════════════════════════════════════════════════╝\n`,
    );

    // STEP 1: Check vector
    console.log(`[STEP 1] Checking User Interest Vector`);
    const { data: stored } = await supabase
      .from("user_interest_vectors")
      .select("interest_vector, updated_at")
      .eq("user_id", userId)
      .single();

    if (!stored?.interest_vector) {
      console.log(`  📝 No interest vector exists (new user or not computed)`);
      console.log(`  ✓ Will use fallback hierarchical ranking\n`);
    } else {
      console.log(`  ✓ Vector exists`);
      const ageMinutes =
        (Date.now() - new Date(stored.updated_at).getTime()) / (1000 * 60);
      if (ageMinutes < 30) {
        console.log(
          `  ✓ Vector is valid (${ageMinutes.toFixed(1)} min old, < 30 min limit)`,
        );
        console.log(`  🧠 Will use PRIORITY 1: Vector-based search\n`);
      } else {
        console.log(
          `  ⏰ Vector is expired (${ageMinutes.toFixed(1)} min > 30 min)`,
        );
        console.log(`  ✓ Will use fallback hierarchical ranking\n`);
      }
    }

    // STEP 2: Get user context
    console.log(`[STEP 2] Fetching User Followed Data`);
    const [subjectsData, followingData] = await Promise.all([
      supabase
        .from("user_subjects")
        .select("subject_id, subjects(name)")
        .eq("user_id", userId),
      supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId),
    ]);

    const followedSubjects = subjectsData.data || [];
    const followingUsers = followingData.data || [];

    console.log(`  ✓ Followed subjects: ${followedSubjects.length}`);
    followedSubjects.forEach((s) => {
      console.log(`    - ${s.subjects?.name || "UNKNOWN"}`);
    });

    console.log(`  ✓ Following users: ${followingUsers.length}`);
    if (followingUsers.length > 0) {
      console.log(
        `    (${followingUsers.map((u) => u.following_id.substring(0, 8)).join(", ")})`,
      );
    }
    console.log();

    // STEP 3: Get all forums
    console.log(`[STEP 3] Fetching All Approved Forums`);
    const { data: allForums } = await supabase
      .from("forums")
      .select(
        "id, title, subject_id, user_id, validation_status, is_ai_verified",
      )
      .eq("validation_status", "approved")
      .eq("is_ai_verified", true);

    console.log(`  ✓ Total approved forums: ${allForums?.length || 0}\n`);

    if (!allForums || allForums.length === 0) {
      console.log(`  ❌ No forums available - feed will be empty`);
      return;
    }

    // STEP 4: Categorize
    console.log(`[STEP 4] Categorizing Forums by Priority`);

    const subjectIds = followedSubjects.map((s) => s.subject_id);
    const userIds = followingUsers.map((u) => u.following_id);

    const p2Forums = allForums.filter((f) => subjectIds.includes(f.subject_id));
    const p3Forums = allForums.filter(
      (f) => userIds.includes(f.user_id) && !subjectIds.includes(f.subject_id),
    );
    const p4Forums = allForums.filter(
      (f) => !subjectIds.includes(f.subject_id) && !userIds.includes(f.user_id),
    );

    console.log(
      `\n  Priority 2 (Followed Subjects): ${p2Forums.length} forums`,
    );
    if (p2Forums.length === 0) {
      console.log(`    ⚠️  No forums for followed subjects`);
    } else {
      p2Forums.slice(0, 3).forEach((f) => {
        console.log(`    [P2] "${f.title.substring(0, 50)}"`);
      });
      if (p2Forums.length > 3)
        console.log(`    ... and ${p2Forums.length - 3} more`);
    }

    console.log(`\n  Priority 3 (Following Users): ${p3Forums.length} forums`);
    if (p3Forums.length === 0) {
      console.log(`    ⚠️  No forums from following users`);
    } else {
      p3Forums.slice(0, 3).forEach((f) => {
        console.log(`    [P3] "${f.title.substring(0, 50)}"`);
      });
      if (p3Forums.length > 3)
        console.log(`    ... and ${p3Forums.length - 3} more`);
    }

    console.log(`\n  Priority 4 (Trending): ${p4Forums.length} forums`);
    if (p4Forums.length === 0) {
      console.log(`    (all forums accounted for in P2 & P3)`);
    } else {
      p4Forums.slice(0, 3).forEach((f) => {
        console.log(`    [P4] "${f.title.substring(0, 50)}"`);
      });
      if (p4Forums.length > 3)
        console.log(`    ... and ${p4Forums.length - 3} more`);
    }

    // STEP 5: Simulate feed response
    console.log(`\n[STEP 5] Simulating Feed Response`);

    const feedCombined = [...p2Forums, ...p3Forums, ...p4Forums];
    const feedPage = feedCombined.slice(0, 10);

    console.log(`\n  Total available: ${feedCombined.length} forums`);
    console.log(`  Page size: 10 forums\n`);

    console.log(`  🎯 Expected API Response (Page 1):\n`);
    feedPage.forEach((f, i) => {
      let priority = "P4";
      if (subjectIds.includes(f.subject_id)) priority = "P2";
      else if (userIds.includes(f.user_id)) priority = "P3";

      console.log(
        `  ${(i + 1).toString().padStart(2)}. [${priority}] "${f.title.substring(0, 55)}"`,
      );
    });

    console.log(`\n  📊 Response metadata:`);
    console.log(`     - total: ${feedCombined.length}`);
    console.log(`     - offset: 0`);
    console.log(`     - limit: 10`);
    console.log(`     - hasMore: ${feedCombined.length > 10}`);

    // Final summary
    console.log(
      `\n╔════════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║  INTEGRATION TEST COMPLETE                                 ║`,
    );
    console.log(
      `╚════════════════════════════════════════════════════════════╝\n`,
    );

    console.log(
      `✅ Feed should show forums in this exact order when you call:`,
    );
    console.log(`   GET /api/forums/feed?limit=10&offset=0\n`);

    console.log(`🔍 To verify:\n`);
    console.log(`   1. Start backend: npm run dev`);
    console.log(
      `   2. Call endpoint: curl http://localhost:5000/api/forums/feed \\`,
    );
    console.log(`      -H "Authorization: Bearer TOKEN" | jq '.forums[0:3]'\n`);
    console.log(
      `   3. First forum should match: [${feedPage[0]?.id || "ID"}]\n`,
    );

    if (feedCombined.length === 0) {
      console.log(
        `⚠️  WARNING: Feed will be empty - no approved forums available`,
      );
    } else if (p2Forums.length === 0 && p3Forums.length === 0) {
      console.log(
        `⚠️  WARNING: Feed will only show trending (P4) - no subject/user matches`,
      );
    } else {
      console.log(
        `✅ Feed should work correctly with proper priority ordering`,
      );
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testFeedIntegration();
