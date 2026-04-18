# Feed System Debug Guide

## 🔍 Overview

This guide helps you debug why the feed priority logic (Vector → Subjects → Following) is not working as expected.

## ⚠️ Common Issues & Quick Fixes

### Issue 1: Feed Shows Only Trending Content (No Subjects)

**Symptom:** Even though user follows subjects, feed shows random forums

**Causes:**

- ❌ User hasn't completed onboarding (no followed subjects)
- ❌ Wrong endpoint being called
- ❌ Cache not cleared

**Fix:**

```bash
# Check if user has followed subjects
node scripts/diagnose_feed.js "USER_ID"

# If no subjects, have user complete onboarding
# Then retry feed
```

### Issue 2: Vector Search Not Triggering

**Symptom:** Feed not using AI personalization even though vector exists

**Causes:**

- ❌ Vector is expired (> 30 minutes old)
- ❌ Vector is NULL in database
- ❌ RPC function `get_semantic_suggestions` is failing

**Fix:**
Check the logs for:

```
[STEP 1] Vector data from DB: { hasData: true, interest_vector: "EXISTS", updated_at: "2026-04-18..." }
✅ PRIORITY 1: Using valid interest vector (age: 5.2 min)
```

If vector is expired:

```
⏰ Vector EXPIRED (age: 45.3 min > 30 min limit)
🧹 Cleared expired vector for user USER_ID
```

---

## 🚀 Step-by-Step Debug Process

### Step 1: Verify Feed Controller is Being Hit

**Location:** `backend/app/services/forum/feed_controller.js:100`

When you call `/api/forums/feed`, you should see in the backend logs:

```
🚀 Feed Request: user=abc123, limit=10, offset=0
🔥 FEED CONTROLLER HIT - getPersonalizedFeed method executing
```

**❌ If NOT printed:**

- Wrong route is being used
- Frontend is calling different endpoint (check network tab)
- Express middleware is preventing request

**Check the route:**

```javascript
// File: backend/app/routes/forum_router.js
router.get("/feed", authMiddleware, FeedController.getPersonalizedFeed);
```

---

### Step 2: Check User Data Fetching

**Expected logs:**

```
[STEP 1] Fetching user_interest_vectors for user abc123
[STEP 1] Vector data from DB: {
  hasData: true,
  interest_vector: "EXISTS",
  updated_at: "2026-04-18T10:30:00Z"
}
```

**Debugging:**

```bash
# Open database terminal
psql -h ogzrsigtrfdrxggjlctx.supabase.co ...

# Query directly
SELECT user_id, interest_vector, updated_at
FROM user_interest_vectors
WHERE user_id = 'USER_ID';
```

---

### Step 3: Verify Vector Validity Check

**Expected logs when vector < 30 min old:**

```
✅ PRIORITY 1: Using valid interest vector (age: 5.2 min)
[STEP 1] Summary: { hasValidVector: true, userVector: "LOADED" }
```

**Expected logs when vector > 30 min old:**

```
⏰ Vector EXPIRED (age: 45.3 min > 30 min limit)
🧹 Cleared expired vector for user abc123
[STEP 1] Summary: { hasValidVector: false, userVector: "NULL" }
```

**If neither appears:**

- Check `isVectorValid()` function (line ~60)
- Verify date calculations

---

### Step 4: Check Branch Selection

**Expected logs:**

```
[STEP 2] Checking if should use vector ranking...
[STEP 2] Conditions: hasValidVector=true, userVector exists=true
🧠 USING PRIORITY 1: Vector-based personalization (semantic search)...
```

OR (if no vector):

```
[STEP 2] Skipping vector search: hasValidVector=false, userVector=false
[STEP 2] Summary: usingVectorRanking=false, candidateForums.length=0
```

---

### Step 5: Verify Fallback Logic

**Expected logs when entering fallback:**

```
[STEP 3] Checking fallback condition: usingVectorRanking=false, candidateForums.length=0
[STEP 3] Should enter fallback? true
🔄 USING FALLBACK: Followed Subjects → Following Users → Trending
```

**Expected logs for data fetching:**

```
[STEP 3] Query Results: followedSubjectIds=["subj-1", "subj-2"]
[STEP 3] Query Results: followedUserIds=["user-1", "user-2"]
📚 Followed subjects: 2, Following users: 2
```

**⚠️ If counts are 0:**

```
📚 Followed subjects: 0, Following users: 0
⚠️ WARNING: User has NO followed subjects! Make sure they completed onboarding.
```

---

### Step 6: Check Forum Categorization

**Expected logs:**

```
[STEP 3] Categorizing forums: checking each forum against followed subjects/users
✓ Forum "How to write essays" matched PRIORITY 2 (subject subj-1)
✓ Forum "Study tips" matched PRIORITY 3 (user user-2)
• Forum "General discussion" to PRIORITY 4 (trending/fallback)

📊 Priority 2 (Subjects): 5, Priority 3 (Users): 3, Priority 4 (Trending): 12
```

**If Priority 2 is 0 but followed subjects count > 0:**

- Forums exist but don't match subject IDs
- Forum `subject_id` doesn't match in `user_subjects` table
- Check forum data: `SELECT subject_id FROM forums LIMIT 5;`

---

## 🔧 Using the Diagnostic Script

The diagnostic script automates all checks:

```bash
# Run for a specific user
node scripts/diagnose_feed.js "550e8400-e29b-41d4-a716-446655440000"
```

**Output will show:**

```
╔════════════════════════════════════════════════════════════╗
║  FEED DIAGNOSTIC SCRIPT                                    ║
╚════════════════════════════════════════════════════════════╝

📋 STEP 1: Checking User Interest Vector

✓ No vector row exists (new user or not yet computed)

📋 STEP 2: Checking Followed Subjects

✓ User follows 2 subject(s):
  - Computer Science (ID: csc-1)
  - Mathematics (ID: math-1)

📋 STEP 3: Checking Following Users

⚠️  User is NOT following any users (0)

📋 STEP 4: Checking Available Forums in DB

✓ Found 15 approved + verified forums

📋 STEP 5: Simulating Priority Categorization

Priority 2 (Subjects): 5 forums
  ✓ "How to solve calculus" (subject match)
  ✓ "Python OOP tutorial" (subject match)

Priority 3 (Users): 0 forums

Priority 4 (Trending): 10 forums
  • "General tips" (fallback)
```

---

## 📊 Real-Time Log Monitoring

While testing, watch the backend logs in real-time:

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Call feed API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/forums/feed?limit=10"

# Look for logs starting with:
🚀 Feed Request:
🔥 FEED CONTROLLER HIT
[STEP 1], [STEP 2], [STEP 3]
```

---

## 🐛 Specific Error Scenarios

### Scenario 1: "Cannot read property of undefined"

```
❌ Error: Cannot read property 'length' of undefined
```

**Check:**

- `allForums` is undefined: RPC returned error
- `followedSubjectsData.data` is null: query failed

**Fix:**

```bash
# Check if table exists
SELECT * FROM user_subjects WHERE user_id = 'USER_ID';
SELECT * FROM user_follows WHERE follower_id = 'USER_ID';
```

### Scenario 2: Feed Always Empty

```
forums: [],
hasMore: false,
total: 0
```

**Check:**

- No approved forums in DB: `SELECT COUNT(*) FROM forums WHERE validation_status='approved' AND is_ai_verified=true;`
- User has zero followed subjects
- Priority categorization filtering too aggressively

**Fix:**

- Create test forums with `validation_status='approved'` and `is_ai_verified=true`
- Have user follow at least one subject
- Check if forum `subject_id` exists in subjects table

### Scenario 3: Wrong Priority Tier Being Used

**Debug logs show:**

```
🧠 USING PRIORITY 1
✅ Got 0 semantically similar forums
```

But expected subjects tier instead.

**Issue:** Vector search returns 0 results, code correctly falls through to fallback.

**Expected behavior:**

```
✅ Got 0 semantically similar forums
[STEP 2] Setting usingVectorRanking = false (0 results)
[STEP 3] Should enter fallback? true
🔄 USING FALLBACK: ...
```

---

## ✅ Checklist Before Debugging

- [ ] Backend is running: `npm run dev`
- [ ] Frontend can call `/api/forums/feed` successfully
- [ ] At least one user exists in `users` table
- [ ] At least 5 forums in DB with `validation_status='approved'` and `is_ai_verified=true`
- [ ] User has completed onboarding (has rows in `user_subjects`)
- [ ] Bearer token is valid in Authorization header

---

## 📝 Creating Test Data

If you need test data to debug:

```sql
-- Add test subject if missing
INSERT INTO subjects (id, name) VALUES
  ('test-subject-1', 'Computer Science')
ON CONFLICT DO NOTHING;

-- Make user follow subjects
INSERT INTO user_subjects (user_id, subject_id) VALUES
  ('USER_ID', 'test-subject-1')
ON CONFLICT DO NOTHING;

-- Create test forum
INSERT INTO forums (
  id, user_id, subject_id, title, content,
  validation_status, is_ai_verified
) VALUES (
  gen_random_uuid(),
  'USER_ID',
  'test-subject-1',
  'Test Forum Title',
  'Test forum content...',
  'approved',
  true
);
```

---

## 🎯 Expected Output When Working Correctly

### With Valid Vector (< 30 min old):

```
🚀 Feed Request: user=abc123, limit=10, offset=0
🔥 FEED CONTROLLER HIT
[STEP 1] Fetching user_interest_vectors for user abc123
✅ PRIORITY 1: Using valid interest vector (age: 5.2 min)
[STEP 2] Checking if should use vector ranking...
🧠 USING PRIORITY 1: Vector-based personalization (semantic search)...
✅ Got 42 semantically similar forums
✅ After approval + embedding filter: 40 forums
Response: { forums: [...], hasMore: true, total: 40 }
```

### Without Vector (Falls Back to Subjects):

```
🚀 Feed Request: user=abc123, limit=10, offset=0
🔥 FEED CONTROLLER HIT
[STEP 1] Fetching user_interest_vectors for user abc123
📝 No interest vector exists yet
[STEP 2] Skipping vector search: hasValidVector=false
[STEP 3] Checking fallback condition: true
🔄 USING FALLBACK: Followed Subjects → Following Users → Trending
📚 Followed subjects: 3, Following users: 2
📊 Priority 2 (Subjects): 8, Priority 3 (Users): 3, Priority 4 (Trending): 15
Response: { forums: [...], hasMore: true, total: 26 }
```

---

## 🆘 Still Not Working?

1. Run diagnostic script: `node scripts/diagnose_feed.js USER_ID`
2. Share the output with your team
3. Check if the diagnostic output matches expectations
4. If diagnostic shows correct data but feed is wrong, the issue is in the categorization logic

---

## 📚 Related Files

- Controller: `backend/app/services/forum/feed_controller.js`
- Routes: `backend/app/routes/forum_router.js`
- Diagnostic: `backend/scripts/diagnose_feed.js`
- This Guide: `DEBUG_FEED.md`
