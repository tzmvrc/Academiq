#!/usr/bin/env node

/**
 * Feed Verification Script
 * Tests the actual feed logic by querying data directly
 * and comparing with what should be categorized
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
  console.error("Usage: node scripts/verify_feed.js <userId>");
  process.exit(1);
}

async function verifyCategorization() {
  try {
    console.log(
      `\n╔════════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║  FEED CATEGORIZATION VERIFICATION                         ║`,
    );
    console.log(`║  User ID: ${userId.substring(0, 40).padEnd(40)}║`);
    console.log(
      `╚════════════════════════════════════════════════════════════╝\n`,
    );

    // Get user's followed subjects
    const { data: subjects } = await supabase
      .from("user_subjects")
      .select("subject_id")
      .eq("user_id", userId);
    const subjectIds = subjects?.map((s) => s.subject_id) || [];

    // Get users the user follows
    const { data: following } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", userId);
    const followingIds = following?.map((f) => f.following_id) || [];

    // Get all approved forums
    const { data: forums } = await supabase
      .from("forums")
      .select("id, title, subject_id, user_id, created_at")
      .eq("validation_status", "approved")
      .eq("is_ai_verified", true);

    console.log(`📊 DATA SUMMARY`);
    console.log(`================\n`);
    console.log(`Followed Subjects: ${subjectIds.length}`);
    subjectIds.forEach((id) => console.log(`  - ${id}`));
    console.log(`\nFollowing Users: ${followingIds.length}`);
    followingIds.slice(0, 5).forEach((id) => console.log(`  - ${id}`));
    if (followingIds.length > 5)
      console.log(`  ... and ${followingIds.length - 5} more`);

    console.log(`\n\n📋 CATEGORIZATION TEST`);
    console.log(`=======================\n`);

    if (!forums || forums.length === 0) {
      console.log(`❌ NO FORUMS FOUND`);
      return;
    }

    const priority2 = [];
    const priority3 = [];
    const priority4 = [];

    forums.forEach((forum) => {
      if (subjectIds.includes(forum.subject_id)) {
        priority2.push(forum);
      } else if (followingIds.includes(forum.user_id)) {
        priority3.push(forum);
      } else {
        priority4.push(forum);
      }
    });

    console.log(`PRIORITY 2 (Followed Subjects): ${priority2.length} forums`);
    if (priority2.length === 0) {
      console.log(`  ⚠️  No forums in followed subjects`);
    } else {
      priority2.forEach((f) =>
        console.log(`  ✓ "${f.title.substring(0, 50)}"`),
      );
    }

    console.log(`\nPRIORITY 3 (Following Users): ${priority3.length} forums`);
    if (priority3.length === 0) {
      console.log(`  ⚠️  No forums from followed users`);
    } else {
      priority3.forEach((f) =>
        console.log(
          `  ✓ "${f.title.substring(0, 50)}" (by ${f.user_id.substring(0, 8)})`,
        ),
      );
    }

    console.log(`\nPRIORITY 4 (Trending): ${priority4.length} forums`);
    priority4
      .slice(0, 3)
      .forEach((f) => console.log(`  • "${f.title.substring(0, 50)}"`));
    if (priority4.length > 3) {
      console.log(`  ... and ${priority4.length - 3} more`);
    }

    // Simulate feed response
    const feed = [...priority2, ...priority3, ...priority4].slice(0, 10);

    console.log(`\n\n🎯 EXPECTED FEED RESPONSE`);
    console.log(`=========================\n`);
    console.log(`Total forums that should appear: ${feed.length}`);
    console.log(
      `Priority distribution: ${priority2.length} + ${priority3.length} + ${priority4.length}\n`,
    );

    feed.forEach((f, i) => {
      let priority = "P4";
      if (subjectIds.includes(f.subject_id)) priority = "P2";
      else if (followingIds.includes(f.user_id)) priority = "P3";

      console.log(`${i + 1}. [${priority}] "${f.title.substring(0, 50)}"`);
    });

    console.log(`\n\n✅ VERIFICATION COMPLETE`);
    console.log(`=========================\n`);
    console.log(
      `If the actual feed endpoint shows forums in this order with these priorities,`,
    );
    console.log(`then the categorization logic is working correctly.`);
    console.log(`If not, there may be an issue with:\n`);
    console.log(`  1. Subject/User ID mismatch`);
    console.log(`  2. Sorting/ordering logic`);
    console.log(`  3. Response field mapping`);
    console.log(`  4. Filtering logic\n`);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

verifyCategorization();
