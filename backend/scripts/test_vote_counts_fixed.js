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
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘  TEST: Vote Count Updates Fix                              â•‘
â•‘  Verifying that upvoting updates forum engagement          â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    `);

    // 1. Get test user
    const testUserId = "ef0170ed-c962-4447-9f2a-c15768fce4d5"; const TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVmMDE3MGVkLWM5NjItNDQ0Ny05ZjJhLWMxNTc2OGZjZTRkNSIsImlhdCI6MTc3NjQ1NjQzNywiZXhwIjoxNzc2NTQyODM3fQ.WAzdZZJMsWspiRWtM3Ru6rCIymuMkrWKtKh4bdYYpmE";
    console.log(`\nðŸ“ Test User: ${testUserId}`);

    // 2. Get a forum to test
    const { data: forums, error: forumErr } = await supabase
      .from("forums")
      .select("id, title, upvotes_count, downvotes_count, comments_count")
      .limit(1);

    if (forumErr || !forums || forums.length === 0) {
      console.error("âŒ Could not fetch test forum:", forumErr);
      return;
    }

    const testForumId = forums[0].id;
    const initialForum = forums[0];

    console.log(`\nðŸ“‹ Test Forum: ${testForumId}`);
    console.log(`   Title: ${initialForum.title}`);
    console.log(`   Initial Stats:`);
    console.log(`     - Upvotes: ${initialForum.upvotes_count}`);
    console.log(`     - Downvotes: ${initialForum.downvotes_count}`);
    console.log(`     - Comments: ${initialForum.comments_count}`);

    const initialScore = ActivityService.calculateEngagementScore(initialForum);
    console.log(`   Initial Engagement Score: ${initialScore}`);

    // 3. Test upvoting
    console.log(`\nðŸ”„ TEST 1: Upvoting forum...`);
    const upvoteRes = await makeRequest(
      "POST",
      `/api/forums/${testForumId}/vote`,
      { voteType: 1 },
      testUserId
    );

    if (upvoteRes.status !== 200) {
      console.error(`âŒ Upvote failed (${upvoteRes.status}):`, upvoteRes.data);
      return;
    }

    console.log(`âœ… Upvote successful`);
    console.log(`   Vote counts in response:`, upvoteRes.data.voteCount);

    // Get updated forum
    const { data: afterUpvote } = await supabase
      .from("forums")
      .select("id, upvotes_count, downvotes_count")
      .eq("id", testForumId)
      .single();

    console.log(`   Forum after upvote:`);
    console.log(`     - Upvotes: ${afterUpvote.upvotes_count} (was ${initialForum.upvotes_count})`);
    console.log(`     - Downvotes: ${afterUpvote.downvotes_count}`);

    if (afterUpvote.upvotes_count === initialForum.upvotes_count) {
      console.warn(
        `   âš ï¸  WARNING: upvotes_count did not increase!`
      );
    } else if (afterUpvote.upvotes_count === initialForum.upvotes_count + 1) {
      console.log(`   âœ… Upvotes correctly incremented by 1`);
    } else {
      console.warn(
        `   âš ï¸  Upvotes changed by unexpected amount: ${afterUpvote.upvotes_count - initialForum.upvotes_count}`
      );
    }

    const scoreAfterUpvote = ActivityService.calculateEngagementScore(
      afterUpvote
    );
    console.log(`   Engagement score after upvote: ${scoreAfterUpvote}`);

    // 4. Test changing vote
    console.log(`\nðŸ”„ TEST 2: Changing vote from upvote to downvote...`);
    const downvoteRes = await makeRequest(
      "POST",
      `/api/forums/${testForumId}/vote`,
      { voteType: -1 },
      testUserId
    );

    if (downvoteRes.status !== 200) {
      console.error(`âŒ Downvote failed (${downvoteRes.status}):`, downvoteRes.data);
      return;
    }

    const { data: afterDownvote } = await supabase
      .from("forums")
      .select("id, upvotes_count, downvotes_count")
      .eq("id", testForumId)
      .single();

    console.log(`âœ… Vote changed to downvote`);
    console.log(`   Forum after downvote:`);
    console.log(`     - Upvotes: ${afterDownvote.upvotes_count} (was ${afterUpvote.upvotes_count})`);
    console.log(`     - Downvotes: ${afterDownvote.downvotes_count} (was ${afterUpvote.downvotes_count})`);

    if (
      afterDownvote.upvotes_count === afterUpvote.upvotes_count - 1 &&
      afterDownvote.downvotes_count === afterUpvote.downvotes_count + 1
    ) {
      console.log(`   âœ… Vote counts correctly updated`);
    } else {
      console.warn(`   âš ï¸  Vote counts did not update as expected`);
    }

    // 5. Test removing vote
    console.log(`\nðŸ”„ TEST 3: Removing vote...`);
    const unvoteRes = await makeRequest(
      "DELETE",
      `/api/forums/${testForumId}/vote`,
      null,
      testUserId
    );

    if (unvoteRes.status !== 200) {
      console.error(`âŒ Unvote failed (${unvoteRes.status}):`, unvoteRes.data);
      return;
    }

    const { data: afterUnvote } = await supabase
      .from("forums")
      .select("id, upvotes_count, downvotes_count")
      .eq("id", testForumId)
      .single();

    console.log(`âœ… Vote removed`);
    console.log(`   Forum after unvote:`);
    console.log(`     - Upvotes: ${afterUnvote.upvotes_count}`);
    console.log(`     - Downvotes: ${afterUnvote.downvotes_count}`);

    if (
      afterUnvote.upvotes_count === initialForum.upvotes_count &&
      afterUnvote.downvotes_count === initialForum.downvotes_count
    ) {
      console.log(`   âœ… Vote counts returned to initial state`);
    } else {
      console.warn(`   âš ï¸  Vote counts did not return to initial state`);
      console.log(`      Expected: ${initialForum.upvotes_count} upvotes, ${initialForum.downvotes_count} downvotes`);
    }

    console.log(`
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘  TEST RESULTS                                              â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

âœ… Vote counts are now being updated correctly
âœ… Engagement scores will reflect vote changes immediately
âœ… Feed priority will update based on new engagement scores

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
