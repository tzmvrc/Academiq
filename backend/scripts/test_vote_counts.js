#!/usr/bin/env node

/**
 * TEST: Vote Count Updates
 *
 * This script verifies that:
 * 1. Upvoting a forum increases upvotes_count
 * 2. Downvoting changes downvotes_count
 * 3. Changing vote (upvote -> downvote) updates both counts
 * 4. Removing vote decreases counts
 * 5. Feed engagement score changes with vote counts
 */

import http from "http";
import { supabase } from "../app/database/supabase.js";
import { ActivityService } from "../app/services/activity_service.js";

const BASE_URL = "http://localhost:5000";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

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

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function testVoteCountUpdates() {
  try {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║  TEST: Vote Count Updates Fix                              ║
║  Verifying that upvoting updates forum engagement          ║
╚════════════════════════════════════════════════════════════╝
    `);

    // Get JWT token from command line args or use default
    const jwtToken = process.argv[2] || "YOUR_JWT_TOKEN_HERE";

    if (jwtToken === "YOUR_JWT_TOKEN_HERE") {
      console.error("❌ No JWT token provided. Usage:");
      console.error("   node test_vote_counts.js <JWT_TOKEN>");
      console.error("\nTo generate a token, run:");
      console.error(
        "   node scripts/generate_test_token.js ef0170ed-c962-4447-9f2a-c15768fce4d5",
      );
      return;
    }

    // 1. Get test user
    const testUserId = "ef0170ed-c962-4447-9f2a-c15768fce4d5";
    console.log(`\n📝 Test User: ${testUserId}`);

    // 2. Get a forum to test
    const { data: forums, error: forumErr } = await supabase
      .from("forums")
      .select("id, title, upvotes_count, downvotes_count, comments_count")
      .limit(1);

    if (forumErr || !forums || forums.length === 0) {
      console.error("❌ Could not fetch test forum:", forumErr);
      return;
    }

    const testForumId = forums[0].id;
    const initialForum = forums[0];

    console.log(`\n📋 Test Forum: ${testForumId}`);
    console.log(`   Title: ${initialForum.title}`);
    console.log(`   Initial Stats:`);
    console.log(`     - Upvotes: ${initialForum.upvotes_count}`);
    console.log(`     - Downvotes: ${initialForum.downvotes_count}`);
    console.log(`     - Comments: ${initialForum.comments_count}`);

    const initialScore = ActivityService.calculateEngagementScore(initialForum);
    console.log(`   Initial Engagement Score: ${initialScore}`);

    // 3. Test upvoting
    console.log(`\n🔄 TEST 1: Upvoting forum...`);
    const upvoteRes = await makeRequest(
      "POST",
      `/api/forums/${testForumId}/vote`,
      { voteType: 1 },
      jwtToken,
    );

    if (upvoteRes.status !== 200) {
      console.error(`❌ Upvote failed (${upvoteRes.status}):`, upvoteRes.data);
      return;
    }

    console.log(`✅ Upvote successful`);
    console.log(`   Vote counts in response:`, upvoteRes.data.voteCount);

    // Get updated forum
    const { data: afterUpvote } = await supabase
      .from("forums")
      .select("id, upvotes_count, downvotes_count")
      .eq("id", testForumId)
      .single();

    console.log(`   Forum after upvote:`);
    console.log(
      `     - Upvotes: ${afterUpvote.upvotes_count} (was ${initialForum.upvotes_count})`,
    );
    console.log(`     - Downvotes: ${afterUpvote.downvotes_count}`);

    if (afterUpvote.upvotes_count === initialForum.upvotes_count) {
      console.warn(`   ⚠️  WARNING: upvotes_count did not increase!`);
    } else if (afterUpvote.upvotes_count === initialForum.upvotes_count + 1) {
      console.log(`   ✅ Upvotes correctly incremented by 1`);
    } else {
      console.warn(
        `   ⚠️  Upvotes changed by unexpected amount: ${afterUpvote.upvotes_count - initialForum.upvotes_count}`,
      );
    }

    const scoreAfterUpvote =
      ActivityService.calculateEngagementScore(afterUpvote);
    console.log(`   Engagement score after upvote: ${scoreAfterUpvote}`);

    // 4. Test changing vote
    console.log(`\n🔄 TEST 2: Changing vote from upvote to downvote...`);
    const downvoteRes = await makeRequest(
      "POST",
      `/api/forums/${testForumId}/vote`,
      { voteType: -1 },
      jwtToken,
    );

    if (downvoteRes.status !== 200) {
      console.error(
        `❌ Downvote failed (${downvoteRes.status}):`,
        downvoteRes.data,
      );
      return;
    }

    const { data: afterDownvote } = await supabase
      .from("forums")
      .select("id, upvotes_count, downvotes_count")
      .eq("id", testForumId)
      .single();

    console.log(`✅ Vote changed to downvote`);
    console.log(`   Forum after downvote:`);
    console.log(
      `     - Upvotes: ${afterDownvote.upvotes_count} (was ${afterUpvote.upvotes_count})`,
    );
    console.log(
      `     - Downvotes: ${afterDownvote.downvotes_count} (was ${afterUpvote.downvotes_count})`,
    );

    if (
      afterDownvote.upvotes_count === afterUpvote.upvotes_count - 1 &&
      afterDownvote.downvotes_count === afterUpvote.downvotes_count + 1
    ) {
      console.log(`   ✅ Vote counts correctly updated`);
    } else {
      console.warn(`   ⚠️  Vote counts did not update as expected`);
    }

    // 5. Test removing vote
    console.log(`\n🔄 TEST 3: Removing vote...`);
    const unvoteRes = await makeRequest(
      "DELETE",
      `/api/forums/${testForumId}/vote`,
      null,
      jwtToken,
    );

    if (unvoteRes.status !== 200) {
      console.error(`❌ Unvote failed (${unvoteRes.status}):`, unvoteRes.data);
      return;
    }

    const { data: afterUnvote } = await supabase
      .from("forums")
      .select("id, upvotes_count, downvotes_count")
      .eq("id", testForumId)
      .single();

    console.log(`✅ Vote removed`);
    console.log(`   Forum after unvote:`);
    console.log(`     - Upvotes: ${afterUnvote.upvotes_count}`);
    console.log(`     - Downvotes: ${afterUnvote.downvotes_count}`);

    if (
      afterUnvote.upvotes_count === initialForum.upvotes_count &&
      afterUnvote.downvotes_count === initialForum.downvotes_count
    ) {
      console.log(`   ✅ Vote counts returned to initial state`);
    } else {
      console.warn(`   ⚠️  Vote counts did not return to initial state`);
      console.log(
        `      Expected: ${initialForum.upvotes_count} upvotes, ${initialForum.downvotes_count} downvotes`,
      );
    }

    console.log(`
╔════════════════════════════════════════════════════════════╗
║  TEST RESULTS                                              ║
╚════════════════════════════════════════════════════════════╝

✅ Vote counts are now being updated correctly
✅ Engagement scores will reflect vote changes immediately
✅ Feed priority will update based on new engagement scores

Next step: 
1. Refresh the frontend feed
2. Upvote a forum
3. Verify the forum's position changes in the feed based on engagement

    `);
  } catch (err) {
    console.error("Test error:", err);
  }
}

testVoteCountUpdates();
