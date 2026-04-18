# Feed Debugging Toolkit Summary

## 📦 What's Been Created

I've created a comprehensive debugging toolkit to help you identify why the feed priority logic isn't working. Here are the three new resources:

### 1. **Diagnostic Script** (`backend/scripts/diagnose_feed.js`)

An automated Node.js script that checks all feed prerequisites and data:

```bash
node scripts/diagnose_feed.js "YOUR_USER_ID"
```

**Outputs:**

- ✅ User's interest vector status (exists? valid? expired?)
- ✅ Followed subjects count and details
- ✅ Following users count and details
- ✅ Available forums count
- ✅ Simulated priority categorization
- ✅ Identified issues and next steps

### 2. **Debug Guide** (`DEBUG_FEED.md`)

Comprehensive guide with:

- 🔍 Step-by-step debug process for each tier
- ⚠️ Common issues and quick fixes
- 📊 Expected logs for each scenario
- 🔧 How to monitor logs in real-time
- 🐛 Specific error scenarios and solutions
- 📝 SQL queries to inspect database

### 3. **Testing Checklist** (`FEED_TESTING_CHECKLIST.md`)

Four test scenarios covering all priority tiers:

- **Test 1:** Vector-Based Feed (Priority 1)
- **Test 2:** Subjects Fallback (Priority 2)
- **Test 3:** Following Users (Priority 3)
- **Test 4:** Trending Fallback (Priority 4)

Each test includes:

- Setup instructions
- Expected logs
- Pass criteria
- Debugging steps if it fails

---

## 🚀 Quick Start (5 minutes)

### Step 1: Run Diagnostic

```bash
cd backend
node scripts/diagnose_feed.js "YOUR_USER_ID"
```

This tells you exactly what data exists for the user and identifies issues.

### Step 2: Check Logs

```bash
npm run dev
# In another terminal:
curl http://localhost:5000/api/forums/feed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Look for these critical logs:

```
🔥 FEED CONTROLLER HIT
✅ PRIORITY 1: Using valid interest vector  (or)
🔄 USING FALLBACK: Followed Subjects...
```

### Step 3: Run Test

Follow one test from `FEED_TESTING_CHECKLIST.md` that matches your issue.

---

## 🎯 Most Likely Issues (from Diagnostic Output)

### Issue A: "User has NO followed subjects"

**Fix:** User hasn't completed onboarding

```bash
# Have them select subjects during onboarding
# Or manually insert:
INSERT INTO user_subjects (user_id, subject_id) VALUES ('USER_ID', 'subject-id');
```

### Issue B: "Found 0 approved forums"

**Fix:** Create test forums with correct flags

```sql
INSERT INTO forums (user_id, subject_id, title, content, validation_status, is_ai_verified)
VALUES (gen_random_uuid(), 'subject-id', 'Test', 'Content', 'approved', true);
```

### Issue C: "Vector exists but too old"

**Fix:** Recompute vector

```bash
POST http://localhost:5000/api/interest-vectors/me/recompute \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Issue D: Priority shows correctly in diagnostic but NOT in feed

**Fix:** Check that `/api/forums/feed` shows [STEP 3] logs

- If not shown: controller not being called (routing issue)
- If shown with wrong categorization: check forum `subject_id` matches `user_subjects.subject_id`

---

## 📋 Log Reading Guide

When you run the API, look for these logs in backend console:

### ✅ Vector Tier Active

```
✅ PRIORITY 1: Using valid interest vector (age: 5.2 min)
🧠 USING PRIORITY 1: Vector-based personalization
```

### ✅ Subjects Tier Active

```
🔄 USING FALLBACK: Followed Subjects → Following Users → Trending
✓ Forum "X" matched PRIORITY 2 (subject subj-1)
📊 Priority 2 (Subjects): 8, Priority 3 (Users): 3
```

### ❌ No Forums Found

```
❌ 0 approved forums in database
⚠️ User has NO followed subjects!
```

### ❌ Wrong Tier

```
[STEP 2] Skipping vector search: hasValidVector=false
But NO [STEP 3] logs appear
```

→ Fallback not being entered (code issue)

---

## 🔧 Database Inspection

Quick SQL checks:

```sql
-- Check user's interest vector
SELECT user_id, interest_vector, updated_at
FROM user_interest_vectors
WHERE user_id = 'USER_ID';

-- Check followed subjects
SELECT s.name, COUNT(*) as count
FROM user_subjects us
JOIN subjects s ON us.subject_id = s.id
WHERE us.user_id = 'USER_ID'
GROUP BY s.name;

-- Check available forums
SELECT COUNT(*) as total,
       COUNT(CASE WHEN validation_status = 'approved' THEN 1 END) as approved,
       COUNT(CASE WHEN is_ai_verified = true THEN 1 END) as verified
FROM forums;

-- Check if subject forums exist
SELECT f.title, f.subject_id
FROM forums f
JOIN user_subjects us ON f.subject_id = us.subject_id
WHERE us.user_id = 'USER_ID'
AND f.validation_status = 'approved'
AND f.is_ai_verified = true
LIMIT 5;
```

---

## 📊 Recommended Debug Flow

1. **Diagnostic Phase** (2 min)

   ```bash
   node scripts/diagnose_feed.js "USER_ID"
   ```

   → Identifies missing data

2. **Endpoint Phase** (2 min)

   ```bash
   npm run dev
   # Call feed, capture logs
   ```

   → Shows which code path executes

3. **Comparison Phase** (1 min)
   - Compare diagnostic data with logs
   - Does diagnostic show subjects? → Are they in logs?
   - Does diagnostic show forums? → Are they in correct priority?

4. **Fix Phase** (Varies)
   - If missing data: Create test data or complete onboarding
   - If wrong priority: Check log output against expected
   - If errors: Share log snippets for debugging

---

## 🎬 Example: Complete Debug Session

### Scenario: "Feed shows trending but not my subjects"

```bash
# 1. Diagnostic
$ node scripts/diagnose_feed.js "abc123"

✓ User follows 3 subject(s):
  - Computer Science (ID: cs-1)
  - Mathematics (ID: math-1)

✓ Found 15 approved + verified forums

Priority 2 (Subjects): 5 forums
Priority 3 (Users): 0 forums
Priority 4 (Trending): 10 forums

# 2. Check logs during API call
$ npm run dev
$ curl http://localhost:5000/api/forums/feed -H "Authorization: Bearer TOKEN"

[Backend logs show:]
✅ PRIORITY 1: Using valid interest vector (age: 2.5 min)
✅ Got 30 semantically similar forums

# 3. Analysis
✓ Diagnostic: subjects exist, forums exist
✓ Logs: vector is being used (Priority 1)
✓ Expected: semantic results should include subject-relevant forums
✓ Status: WORKING AS EXPECTED

# But wait - user says they see "only trending"
# Let's check frontend
$ Check Network tab: POST /api/forums/feed?
  Are params correct? Is token valid?

# If params/token wrong: fix frontend call
# If everything correct: vector search may be returning wrong results
# → Check embedding service or semantic search function
```

---

## 🚨 Critical Failure Scenarios

### Scenario 1: Logs never show "FEED CONTROLLER HIT"

**Problem:** Wrong endpoint or routing issue
**Fix:**

```javascript
// Verify route exists in forum_router.js:
router.get("/feed", authMiddleware, FeedController.getPersonalizedFeed);

// Check frontend calls correct URL:
fetch("/api/forums/feed"); // Should be this
// NOT: fetch("/forums")
```

### Scenario 2: Logs show "PRIORITY 1" but forums are wrong

**Problem:** Vector search is working, but returning irrelevant results
**Fix:**

```javascript
// Check if RPC function exists:
SELECT * FROM pg_proc WHERE proname = 'get_semantic_suggestions';

// Test it manually:
SELECT * FROM get_semantic_suggestions('[0.1, 0.2, ...]', 200);

// If it returns nothing:
// → Check embeddings are computed for forums
// → Check pgvector is installed
```

### Scenario 3: "Following subjects: 0" in diagnostic

**Problem:** User didn't complete onboarding
**Fix:**

```bash
# Have them complete onboarding by selecting subjects
# OR insert test data:
INSERT INTO user_subjects (user_id, subject_id)
VALUES ('USER_ID', 'cs-1'), ('USER_ID', 'math-1');
```

### Scenario 4: Logs show Priority 2 correctly but feed is still empty

**Problem:** Approved/verified filter too strict
**Fix:**

```sql
-- Check actual forum flags:
SELECT validation_status, is_ai_verified, COUNT(*)
FROM forums
GROUP BY validation_status, is_ai_verified;

-- If no forums match both conditions:
-- Update test forums:
UPDATE forums SET validation_status = 'approved', is_ai_verified = true
WHERE id IN (...);
```

---

## ✅ Success Indicators

When the priority system works correctly:

- [ ] Diagnostic shows expected data (subjects, forums, users)
- [ ] Logs show correct priority tier ([STEP 1], [STEP 2], or [STEP 3])
- [ ] Forum ordering matches priority (subjects first, then users, then trending)
- [ ] Changing vector/subjects changes feed results
- [ ] No errors in backend logs
- [ ] API responds with 200 status

---

## 📞 Next Steps

1. **Run** `node scripts/diagnose_feed.js "YOUR_USER_ID"`
2. **Share** the diagnostic output
3. **Check** the `DEBUG_FEED.md` for matching scenario
4. **Follow** the FEED_TESTING_CHECKLIST.md for your case
5. **Monitor** backend logs as you test

---

## 🗂️ File Reference

| File                        | Purpose              | When to Use                   |
| --------------------------- | -------------------- | ----------------------------- |
| `diagnose_feed.js`          | Automated data check | First line of debugging       |
| `DEBUG_FEED.md`             | Detailed debug guide | Understanding each step       |
| `FEED_TESTING_CHECKLIST.md` | Test scenarios       | Validating each priority tier |
| `feed_controller.js`        | Main logic           | Reading actual implementation |
| `forum_router.js`           | Route config         | Verifying endpoint wiring     |

---

## 🎯 Primary Actions

### Immediate (Now):

1. Run: `node scripts/diagnose_feed.js "USER_ID"`
2. Share output

### Short-term (Next 15 min):

3. Call `/api/forums/feed` with debug logs
4. Identify which priority tier is active
5. Compare with diagnostic data

### Medium-term (Next hour):

6. Run appropriate test scenario from FEED_TESTING_CHECKLIST.md
7. Verify all priority tiers work
8. Fix any identified issues

---

**You now have:**

- ✅ Diagnostic script to inspect data
- ✅ Debug guide to understand each step
- ✅ Test checklist to validate functionality
- ✅ Clear error scenarios and fixes

**Start with:** `node scripts/diagnose_feed.js "YOUR_USER_ID"`
