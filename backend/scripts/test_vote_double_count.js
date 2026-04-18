/**
 * Diagnostic Test: Vote Count Double Increment Issue
 *
 * This test will:
 * 1. Get a forum's initial upvote count
 * 2. Upvote the forum
 * 3. Get the final upvote count
 * 4. Show if it incremented by 1 or 2
 *
 * Run with: node scripts/test_vote_double_count.js
 */

import http from "http";
import { supabase } from "../app/database/supabase.js";

const BASE_URL = "http://localhost:5000";

// Test user token (replace with your own)
const TEST_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVmMDE3MGVkLWM5NjItNDQ0Ny05ZjJhLWMxNTc2OGZjZTRkNSIsImlhdCI6MTc3NjQ1NjQzNywiZXhwIjoxNzc2NTQyODM3fQ.WAzdZZJMsWspiRWtM3Ru6rCIymuMkrWKtKh4bdYYpmE";

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TEST_TOKEN}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (err) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testVoteDoubleCount() {
  try {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  DIAGNOSTIC TEST: Vote Count Double Increment Issue        ║
╚════════════════════════════════════════════════════════════╝
    `);

    // Step 1: Get a test forum
    console.log(`\n📋 Step 1: Getting test forum...`);
    const { data: forums, error: forumErr } = await supabase
      .from("forums")
      .select("id, title, upvotes_count")
      .eq("validation_status", "approved")
      .limit(1);

    if (forumErr || !forums || forums.length === 0) {
      console.error("❌ Could not fetch test forum:", forumErr);
      return;
    }

    const testForumId = forums[0].id;
    const initialUpvotes = forums[0].upvotes_count;

    console.log(`✅ Test Forum: ${forums[0].title}`);
    console.log(`   ID: ${testForumId}`);
    console.log(`   Initial Upvotes: ${initialUpvotes}`);

    // Step 2: Remove any existing vote
    console.log(`\n📋 Step 2: Removing any existing vote...`);
    try {
      await makeRequest("DELETE", `/api/forums/${testForumId}/vote`);
      console.log(`✅ Existing vote removed (if any)`);
    } catch (err) {
      console.log(`ℹ️  No existing vote to remove`);
    }

    // Wait for database to update
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get current count after removing vote
    const { data: forumAfterRemove } = await supabase
      .from("forums")
      .select("upvotes_count")
      .eq("id", testForumId)
      .single();

    console.log(
      `   Upvotes after removing vote: ${forumAfterRemove.upvotes_count}`,
    );

    // Step 3: Send upvote request
    console.log(`\n📋 Step 3: Sending UPVOTE request...`);
    console.log(`   (Watch backend logs for detailed vote processing)`);

    const upvoteResponse = await makeRequest(
      "POST",
      `/api/forums/${testForumId}/vote`,
      { voteType: 1 },
    );

    console.log(`✅ Upvote Response Status: ${upvoteResponse.status}`);
    if (upvoteResponse.data?.voteCount) {
      console.log(
        `   Response shows: upvotes=${upvoteResponse.data.voteCount.upvotes}`,
      );
    }

    // Wait for database to update
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Step 4: Get forum state after upvote
    console.log(`\n📋 Step 4: Fetching forum state after upvote...`);
    const { data: forumAfterUpvote } = await supabase
      .from("forums")
      .select("upvotes_count, downvotes_count")
      .eq("id", testForumId)
      .single();

    console.log(`✅ Forum after upvote:`);
    console.log(`   Upvotes: ${forumAfterUpvote.upvotes_count}`);
    console.log(`   Downvotes: ${forumAfterUpvote.downvotes_count}`);

    // Step 5: Calculate the delta
    console.log(`\n📊 ANALYSIS:`);
    const expectedUpvotes = forumAfterRemove.upvotes_count + 1;
    const actualUpvotes = forumAfterUpvote.upvotes_count;
    const delta = actualUpvotes - forumAfterRemove.upvotes_count;

    console.log(
      `   Expected upvotes: ${expectedUpvotes} (${forumAfterRemove.upvotes_count} + 1)`,
    );
    console.log(`   Actual upvotes: ${actualUpvotes}`);
    console.log(`   Delta: +${delta}`);

    if (delta === 1) {
      console.log(`\n✅ CORRECT: Vote incremented by 1`);
    } else if (delta === 2) {
      console.log(`\n❌ BUG: Vote incremented by 2 (should be 1)`);
      console.log(`   This suggests the vote is being counted twice`);
    } else {
      console.log(`\n⚠️  UNEXPECTED: Vote incremented by ${delta}`);
    }

    // Step 6: Check votes table
    console.log(`\n📋 Step 5: Checking votes table...`);
    const userId = "ef0170ed-c962-4447-9f2a-c15768fce4d5"; // from token
    const { data: userVotes, error: votesErr } = await supabase
      .from("votes")
      .select("id, vote_type, created_at, updated_at")
      .eq("user_id", userId)
      .eq("forum_id", testForumId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!votesErr && userVotes && userVotes.length > 0) {
      console.log(
        `✅ Found ${userVotes.length} vote(s) for this user on this forum:`,
      );
      userVotes.forEach((vote, idx) => {
        console.log(
          `   ${idx + 1}. Type: ${vote.vote_type}, Created: ${new Date(vote.created_at).toLocaleTimeString()}`,
        );
      });
    }

    console.log(`
╔════════════════════════════════════════════════════════════╗
║  NEXT STEPS:                                               ║
║  1. Check backend logs above for vote processing flow      ║
║  2. Look for double calls to _updateForumVoteCounts        ║
║  3. Check if deltas are calculated correctly               ║
╚════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    console.error("❌ Test error:", err);
  }

  process.exit(0);
}

testVoteDoubleCount();
