#!/usr/bin/env node

/**
 * Feed Diagnostic Script
 * Runs through all the feed logic steps to identify where issues might be
 *
 * Usage: node scripts/diagnose_feed.js <userId>
 * Example: node scripts/diagnose_feed.js "123e4567-e89b-12d3-a456-426614174000"
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const userId = process.argv[2];
if (!userId) {
  console.error("❌ Usage: node scripts/diagnose_feed.js <userId>");
  process.exit(1);
}

console.log(`\n╔════════════════════════════════════════════════════════════╗`);
console.log(`║  FEED DIAGNOSTIC SCRIPT                                    ║`);
console.log(`║  User ID: ${userId.substring(0, 40).padEnd(40)}║`);
console.log(`╚════════════════════════════════════════════════════════════╝\n`);

async function diagnose() {
  try {
    // ========================================
    // STEP 1: Check User Interest Vector
    // ========================================
    console.log(`\n📋 STEP 1: Checking User Interest Vector\n`);

    const { data: userVector, error: vectorError } = await supabase
      .from("user_interest_vectors")
      .select("interest_vector, updated_at")
      .eq("user_id", userId)
      .single();

    if (vectorError && vectorError.code !== "PGRST116") {
      console.error(`❌ Error fetching vector: ${vectorError.message}`);
    } else if (!userVector) {
      console.log(`✓ No vector row exists (new user or not yet computed)`);
    } else {
      console.log(`✓ Vector row exists`);
      console.log(
        `  - interest_vector: ${userVector.interest_vector ? "EXISTS ✓" : "NULL ✗"}`,
      );
      console.log(`  - updated_at: ${userVector.updated_at || "NULL ✗"}`);

      if (userVector.updated_at) {
        const ageMs = Date.now() - new Date(userVector.updated_at).getTime();
        const ageMinutes = ageMs / (1000 * 60);
        const isValid = ageMinutes < 30;
        console.log(
          `  - Age: ${ageMinutes.toFixed(1)} minutes (${isValid ? "✓ VALID" : "✗ EXPIRED"})`,
        );
      }
    }

    // ========================================
    // STEP 2: Check Followed Subjects
    // ========================================
    console.log(`\n📋 STEP 2: Checking Followed Subjects\n`);

    const { data: followedSubjects, error: subjectError } = await supabase
      .from("user_subjects")
      .select("subject_id, subjects(id, name)")
      .eq("user_id", userId);

    if (subjectError) {
      console.error(`❌ Error fetching subjects: ${subjectError.message}`);
    } else if (!followedSubjects || followedSubjects.length === 0) {
      console.log(
        `⚠️  User has NO followed subjects (${followedSubjects?.length || 0})`,
      );
      console.log(`    → User may not have completed onboarding!`);
      console.log(`    → Feed will show ONLY trending content (Priority 4)`);
    } else {
      console.log(`✓ User follows ${followedSubjects.length} subject(s):`);
      followedSubjects.forEach((s) => {
        console.log(
          `  - ${s.subjects?.name || "UNKNOWN"} (ID: ${s.subject_id})`,
        );
      });
    }

    // ========================================
    // STEP 3: Check Following Users
    // ========================================
    console.log(`\n📋 STEP 3: Checking Following Users\n`);

    // Note: user_follows has ambiguous relationships to users table
    // We need just the IDs, not the full embed
    const { data: followingUsers, error: followError } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", userId);

    if (followError) {
      console.error(`❌ Error fetching following: ${followError.message}`);
    } else if (!followingUsers || followingUsers.length === 0) {
      console.log(
        `⚠️  User is NOT following any users (${followingUsers?.length || 0})`,
      );
    } else {
      console.log(`✓ User follows ${followingUsers.length} user(s):`);
      const followingIds = followingUsers.map((f) => f.following_id);
      console.log(`  IDs: ${followingIds.join(", ")}`);
    }

    // ========================================
    // STEP 4: Check Available Forums
    // ========================================
    console.log(`\n📋 STEP 4: Checking Available Forums in DB\n`);

    const { data: allForums, error: forumError } = await supabase
      .from("forums")
      .select(
        "id, title, subject_id, user_id, validation_status, is_ai_verified",
      )
      .eq("validation_status", "approved")
      .eq("is_ai_verified", true)
      .limit(5);

    if (forumError) {
      console.error(`❌ Error fetching forums: ${forumError.message}`);
    } else {
      console.log(
        `✓ Found ${allForums?.length} approved + verified forums (showing 5):`,
      );
      allForums?.forEach((f) => {
        console.log(`  - ${f.title.substring(0, 50)}`);
        console.log(`    ID: ${f.id}`);
        console.log(`    Subject: ${f.subject_id}`);
        console.log(`    Author: ${f.user_id}`);
      });
    }

    // ========================================
    // STEP 5: Simulate Priority Categorization
    // ========================================
    console.log(`\n📋 STEP 5: Simulating Priority Categorization\n`);

    if (allForums && followedSubjects && followingUsers) {
      const subjectIds = followedSubjects.map((s) => s.subject_id);
      const userIds = followingUsers.map((f) => f.following_id);

      console.log(`Subject IDs to match: ${JSON.stringify(subjectIds)}`);
      console.log(`User IDs to match: ${JSON.stringify(userIds)}\n`);

      const priority2 = allForums.filter((f) =>
        subjectIds.includes(f.subject_id),
      );
      const priority3 = allForums.filter(
        (f) =>
          userIds.includes(f.user_id) && !subjectIds.includes(f.subject_id),
      );
      const priority4 = allForums.filter(
        (f) =>
          !subjectIds.includes(f.subject_id) && !userIds.includes(f.user_id),
      );

      console.log(`Priority 2 (Subjects): ${priority2.length} forums`);
      if (priority2.length === 0) {
        console.log(`  ⚠️  NO forums for followed subjects`);
        console.log(
          `  Followed subjects: ${followedSubjects.map((s) => s.subjects?.name || "UNKNOWN").join(", ")}`,
        );
        console.log(
          `  Forum subjects in DB: ${[...new Set(allForums.map((f) => f.subject_id))].join(", ")}`,
        );
      } else {
        priority2.forEach((f) => {
          console.log(`  ✓ "${f.title.substring(0, 40)}" (subject match)`);
        });
      }

      console.log(`\nPriority 3 (Users): ${priority3.length} forums`);
      if (priority3.length > 0) {
        priority3.forEach((f) => {
          console.log(`  ✓ "${f.title.substring(0, 40)}" (user match)`);
        });
      }

      console.log(`\nPriority 4 (Trending): ${priority4.length} forums`);
      if (priority4.length > 0) {
        priority4.slice(0, 3).forEach((f) => {
          console.log(`  • "${f.title.substring(0, 40)}" (fallback)`);
        });
        if (priority4.length > 3) {
          console.log(`  ... and ${priority4.length - 3} more`);
        }
      }
    }

    // ========================================
    // Summary
    // ========================================
    console.log(
      `\n╔════════════════════════════════════════════════════════════╗`,
    );
    console.log(
      `║  DIAGNOSTIC SUMMARY                                        ║`,
    );
    console.log(
      `╚════════════════════════════════════════════════════════════╝\n`,
    );

    const issues = [];

    if (!userVector?.interest_vector) {
      issues.push("❌ No valid interest vector (will use fallback)");
    } else {
      issues.push("✓ Has valid interest vector");
    }

    if (!followedSubjects || followedSubjects.length === 0) {
      issues.push("❌ No followed subjects - user must complete onboarding!");
    } else {
      issues.push(`✓ Has ${followedSubjects.length} followed subject(s)`);
    }

    if (!followingUsers || followingUsers.length === 0) {
      issues.push("⚠️  Not following any users (but OK)");
    } else {
      issues.push(`✓ Following ${followingUsers.length} user(s)`);
    }

    if (!allForums || allForums.length === 0) {
      issues.push("❌ NO APPROVED FORUMS IN DATABASE - feed will be empty!");
    } else {
      issues.push(`✓ ${allForums.length} approved forums available`);
    }

    issues.forEach((issue) => console.log(`${issue}`));

    console.log("\n🔍 NEXT STEPS:\n");
    if (
      !userVector?.interest_vector &&
      (!followedSubjects || followedSubjects.length === 0)
    ) {
      console.log(`1. User needs to complete onboarding (select subjects)\n`);
    }
    if (!allForums || allForums.length === 0) {
      console.log(`1. Create some test forums and verify they are:\n`);
      console.log(`   - validation_status = 'approved'\n`);
      console.log(`   - is_ai_verified = true\n`);
    }
    console.log(`2. Call /api/forums/feed with this user token\n`);
    console.log(`3. Check backend logs for priority selection logs\n`);
  } catch (err) {
    console.error(`\n❌ Unexpected error:`, err.message);
    console.error(err);
  }
}

diagnose();
