# 🔍 Debugging: Vote Count Increments by 2 Instead of 1

## Problem Summary

Every time a user upvotes a forum, the upvotes_count increases by 2 instead of 1.

## Possible Causes

### 1. ✅ Duplicate Vote Processing (MOST LIKELY)

- Vote is being processed through TWO different code paths
- OR the vote handler is being called twice

### 2. Database Trigger

- PostgreSQL trigger on `votes` table auto-increments forum upvotes
- PLUS our application code also increments it
- Result: +2 instead of +1

### 3. Frontend Double-Click

- Frontend sending vote request twice
- Second request updates existing vote but calculation goes wrong
- Result: appears as +2

### 4. Race Condition

- Two concurrent vote requests from the same user
- Both see oldVoteType = 0, both add +1
- Result: +2

---

## Diagnostic Tests

### Test 1: Run Full Diagnostic Script

```bash
cd backend
npm run dev  # in terminal 1
node scripts/test_vote_double_count.js  # in terminal 2
```

**What to look for:**

- Backend logs showing vote processing flow
- Delta calculation (should be +1, not +2)
- Vote table contents (should have 1 record, not 2)

### Test 2: Manual Database Check

```bash
# Login to Supabase console and run:

-- Check forum vote counts for a specific user
SELECT
  f.id,
  f.title,
  f.upvotes_count,
  COUNT(v.id) as actual_vote_count
FROM forums f
LEFT JOIN votes v ON f.id = v.forum_id AND v.vote_type = 1
WHERE f.id = 'YOUR_FORUM_ID'
GROUP BY f.id, f.title, f.upvotes_count;

-- Check votes for a specific user
SELECT id, forum_id, vote_type, created_at, updated_at
FROM votes
WHERE user_id = 'YOUR_USER_ID'
AND forum_id = 'YOUR_FORUM_ID'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Debugging Checklist

### ✅ Enable Detailed Logging

Logging has been ADDED to:

- `votes_model.js` - setVote() function
- `votes_model.js` - \_updateForumVoteCounts() function
- `forum_controller.js` - voteForum() function

### Logs to Watch For:

```
⭐ [voteForum] REQUEST RECEIVED          <- Vote request arrives
⭐ [voteForum] userId=..., forumId=..., voteType=1
🔍 [setVote] STARTING                    <- Vote model starts
📋 [setVote] Existing vote check: existing=null  <- No prior vote
📊 [setVote] oldVoteType=0                <- Initial state
➕ [setVote] INSERTING new vote           <- Creating first vote
🔧 [setVote] Calling _updateForumVoteCounts   <- Counting vote
🔧 [_updateForumVoteCounts] STARTING      <- Count update starts
📊 [_updateForumVoteCounts] Final deltas: upvotesDelta=1  <- Should be 1!
📋 [_updateForumVoteCounts] Current DB counts: upvotes=10  <- Before
🎯 [_updateForumVoteCounts] Calculated new counts: upvotes=11  <- After
✅ [_updateForumVoteCounts] Successfully updated  <- Confirm update
```

### RED FLAGS (look for these):

1. ❌ **`_updateForumVoteCounts` called TWICE**
   - If you see the function log twice, that's the bug!

2. ❌ **`upvotesDelta=2`**
   - Should always be 1 for first upvote
   - If it's 2, the delta calculation is wrong

3. ❌ **Multiple vote records in database**
   - `SELECT COUNT(*) FROM votes WHERE user_id=X AND forum_id=Y`
   - Should have 1 record per user/forum combination
   - If >1, duplicate votes are being created

4. ❌ **Vote count mismatch**
   - DB count (10) + delta (+1) ≠ Response (12)
   - If you see 10 + 1 = 12, something is reading stale data

---

## Steps to Debug

### Step 1: Run the diagnostic

```bash
node scripts/test_vote_double_count.js
```

### Step 2: Watch backend logs carefully

Look for:

- How many times `_updateForumVoteCounts` is called
- What the delta values are
- What the before/after counts are

### Step 3: Check database directly

Compare:

- `forums.upvotes_count` (from app)
- `COUNT(votes)` where vote_type=1 (actual count)
- Do they match?

### Step 4: Check votes table

```sql
SELECT * FROM votes
WHERE forum_id = '<YOUR_TEST_FORUM_ID>'
ORDER BY created_at DESC
LIMIT 5;
```

Are there duplicate records?

---

## Most Likely Fix Scenarios

### Scenario A: Trigger on votes table

**Problem**: PostgreSQL trigger auto-increments upvotes_count when vote is inserted
**Solution**:

- Disable the trigger OR
- Remove the trigger and rely only on application code

### Scenario B: Vote being called twice

**Problem**: VotesModel.setVote() is being called in two different places
**Solution**:

- Consolidate to single call path
- Add guard to prevent duplicate calls

### Scenario C: Race condition on vote update

**Problem**: Two requests process same vote simultaneously
**Solution**:

- Add database-level unique constraint (already exists on votes table)
- Use transactions to serialize updates

---

## Commands to Run

```bash
# Terminal 1: Start backend with logging
cd backend
npm run dev

# Terminal 2: Run diagnostic test
cd backend
node scripts/test_vote_double_count.js

# Terminal 3: Watch backend logs real-time
tail -f backend.log  # if logging to file
# Or use VSCode terminal to see console output
```

## Expected Output

**CORRECT behavior:**

```
Initial Upvotes: 10
After upvote: 11
Delta: +1
✅ CORRECT: Vote incremented by 1
```

**BUGGY behavior:**

```
Initial Upvotes: 10
After upvote: 12
Delta: +2
❌ BUG: Vote incremented by 2 (should be 1)
This suggests the vote is being counted twice
```

---

## Quick Hypothesis Testing

### Q: Does it ALWAYS add exactly 2?

- A: If yes → likely a fixed bug (trigger or duplicate code path)
- A: If no (varies) → likely a race condition

### Q: Does it happen on first vote only, or always?

- A: If first vote only → initial state issue
- A: If always → structural problem in vote counting

### Q: Does it happen for both upvotes and downvotes?

- A: If both → affects all vote types equally
- A: If only upvotes → specific logic issue with upvote path

---

## Next Steps

1. Run diagnostic test
2. Share backend logs
3. Check database manually
4. Identify which function is being called twice (if any)
5. Fix the root cause

The logging I added should make it very clear where the double counting is happening!
