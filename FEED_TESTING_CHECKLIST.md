# Feed Priority Logic Testing Checklist

## 🎯 Goal

Verify that the feed correctly implements the 4-tier priority system:

1. ✅ User Interest Vector (< 30 min old)
2. ✅ Followed Subjects
3. ✅ Following Users
4. ✅ Trending (All other approved forums)

---

## 🚀 Quick Start

### Prerequisite Setup (5 minutes)

```bash
# 1. Start backend with verbose logging
cd backend
npm run dev

# 2. In another terminal, check if user is set up
node scripts/diagnose_feed.js "YOUR_USER_ID"
```

---

## 📋 Test Scenarios

### Test 1: Vector-Based Feed (Priority 1)

**Goal:** Verify feed uses AI personalization when vector < 30 min old

**Setup:**

```bash
# 1. Have user interact with forums (creates activities)
# - Upvote a forum about "calculus"
# - Comment on "linear algebra" forum
# - Save a "discrete math" forum

# 2. Trigger vector computation
curl -X POST http://localhost:5000/api/interest-vectors/me/recompute \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check response shows new vector timestamp
```

**Test Execution:**

```bash
# 3. Call feed within 30 minutes
curl http://localhost:5000/api/forums/feed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Logs:**

```
✅ PRIORITY 1: Using valid interest vector (age: 5.2 min)
🧠 USING PRIORITY 1: Vector-based personalization (semantic search)...
✅ Got 30+ semantically similar forums
```

**Expected Result:**

- Feed returns math-related forums (semantic matches)
- Forums sorted by similarity score
- Should see math topics you engaged with

**Pass Criteria:**

- ✓ Logs show "PRIORITY 1"
- ✓ Forums returned are relevant to your interactions
- ✓ Different from subjects-based results

---

### Test 2: Fallback to Subjects (Priority 2)

**Goal:** Verify feed falls back to subjects when vector expires

**Setup:**

```bash
# 1. Clear the user's interest vector (simulate expiration)
psql -d your_db -c "
  UPDATE user_interest_vectors
  SET interest_vector = NULL
  WHERE user_id = 'YOUR_USER_ID';
"

# OR via script (if you have admin access)
# Delete the vector manually from dashboard
```

**Test Execution:**

```bash
# 2. Call feed (should now use subjects)
curl http://localhost:5000/api/forums/feed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Logs:**

```
📝 No interest vector exists yet
[STEP 3] Checking fallback condition: true
🔄 USING FALLBACK: Followed Subjects → Following Users → Trending
📚 Followed subjects: 3, Following users: 1
✓ Forum "Calculus" matched PRIORITY 2 (subject subj-1)
✓ Forum "Algebra" matched PRIORITY 2 (subject subj-1)
📊 Priority 2 (Subjects): 8, Priority 3 (Users): 2, Priority 4 (Trending): 12
```

**Expected Result:**

- Feed shows forums from your followed subjects
- Forums prioritized by subject match (priority 2)
- Then from users you follow (priority 3)
- Then trending content (priority 4)

**Pass Criteria:**

- ✓ Logs show "PRIORITY 2" categorization
- ✓ Top forums are from your subjects
- ✓ Each forum's `subject.name` matches your interests

---

### Test 3: Following Users Feed (Priority 3)

**Goal:** Verify following users' forums show when subjects have no content

**Setup:**

```bash
# 1. Create forums by specific users
POST /api/forums with:
  - User A posts in subject X
  - User B posts in subject Y
  - User C posts in subject Z

# 2. User follows users A & B but NOT subject Y or Z
# 3. Clear user's interest vector
```

**Test Execution:**

```bash
# Call feed
curl http://localhost:5000/api/forums/feed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Logs:**

```
✓ Forum "User A's post" matched PRIORITY 2 (subject subj-X)
✓ Forum "User B's post" matched PRIORITY 3 (user user-B)
• Forum "User C's post" to PRIORITY 4 (trending/fallback)

📊 Priority 2 (Subjects): 1, Priority 3 (Users): 1, Priority 4 (Trending): 1
```

**Expected Result:**

- User A's forum appears first (subject match)
- User B's forum appears second (following user)
- User C's forum appears last (no connection)

**Pass Criteria:**

- ✓ Forums from followed users show before strangers
- ✓ Subject-followed forums still take priority
- ✓ Correct categorization in logs

---

### Test 4: Trending Fallback (Priority 4)

**Goal:** Verify trending forums show when no personal connection

**Setup:**

```bash
# 1. Have user NOT follow any subjects/users
# Clear their follows:
DELETE FROM user_subjects WHERE user_id = 'YOUR_USER_ID';
DELETE FROM user_follows WHERE follower_id = 'YOUR_USER_ID';

# 2. Clear their interest vector
UPDATE user_interest_vectors
SET interest_vector = NULL
WHERE user_id = 'YOUR_USER_ID';

# 3. Create high-engagement forums
POST /api/forums with many upvotes/comments
```

**Test Execution:**

```bash
curl http://localhost:5000/api/forums/feed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Logs:**

```
📚 Followed subjects: 0, Following users: 0
⚠️ WARNING: User has NO followed subjects!
• Forum "Popular Post" to PRIORITY 4 (trending/fallback)
• Forum "Trending Topic" to PRIORITY 4 (trending/fallback)

📊 Priority 2 (Subjects): 0, Priority 3 (Users): 0, Priority 4 (Trending): 20
```

**Expected Result:**

- All forums from Priority 4 (trending)
- Sorted by engagement + recency
- Warnings about no followed subjects

**Pass Criteria:**

- ✓ Logs show Priority 4 categorization
- ✓ High-engagement forums appear first
- ✓ Still functioning with no personal context

---

## 📊 Verification Matrix

| Priority | Condition               | Pass Criteria                 | Test       |
| -------- | ----------------------- | ----------------------------- | ---------- |
| **1**    | Vector < 30 min old     | Semantic search results shown | Test 1     |
| **2**    | Followed subjects exist | Subject forums ranked first   | Test 2 & 3 |
| **3**    | Follow users            | User's forums after subjects  | Test 3     |
| **4**    | All other forums        | Trending by engagement        | Test 4     |

---

## 🔍 Log Inspection Checklist

For each test, verify these logs appear:

### ✅ Controller Hit

```
🚀 Feed Request: user=...
🔥 FEED CONTROLLER HIT
```

### ✅ Vector Check (STEP 1)

One of:

```
✅ PRIORITY 1: Using valid interest vector (age: X min)
```

OR

```
⏰ Vector EXPIRED
```

OR

```
📝 No interest vector exists yet
```

### ✅ Branch Selection (STEP 2)

Either vector logs OR:

```
[STEP 2] Skipping vector search: hasValidVector=false
```

### ✅ Fallback (STEP 3)

```
[STEP 3] Checking fallback condition: true
🔄 USING FALLBACK: Followed Subjects → Following Users → Trending
```

### ✅ Categorization (STEP 3)

```
✓ Forum "X" matched PRIORITY 2 (subject ...)
✓ Forum "Y" matched PRIORITY 3 (user ...)
📊 Priority 2: X, Priority 3: Y, Priority 4: Z
```

---

## 🐛 Debugging Failed Tests

### Test 1 Fails: Vector not being used

```
Symptom: Logs show "No interest vector" instead of "Using valid vector"

Check:
1. Is user in user_interest_vectors table?
   SELECT * FROM user_interest_vectors WHERE user_id = 'USER_ID';

2. Is updated_at recent (< 30 min)?
   SELECT EXTRACT(EPOCH FROM (NOW() - updated_at))/60 as minutes_old;

3. Is interest_vector NOT NULL?
   SELECT interest_vector FROM user_interest_vectors WHERE user_id = 'YOUR_USER_ID';
   (Should return a pgvector value, not NULL)

Fix:
- Recompute vector: POST /api/interest-vectors/me/recompute
- Or manually set: UPDATE user_interest_vectors SET updated_at = NOW() WHERE ...
```

### Test 2 Fails: Not falling back to subjects

```
Symptom: After clearing vector, still shows Priority 1 or empty

Check:
1. Does user have followed subjects?
   SELECT COUNT(*) FROM user_subjects WHERE user_id = 'USER_ID';

2. Do forums exist for those subjects?
   SELECT f.id, f.title
   FROM forums f
   WHERE f.subject_id IN (
     SELECT subject_id FROM user_subjects WHERE user_id = 'USER_ID'
   )
   AND f.validation_status = 'approved'
   AND f.is_ai_verified = true;

3. Are the logs showing the fallback condition check?
   Look for: "[STEP 3] Checking fallback condition: true"

Fix:
- Verify subject IDs match: subject_id in forums == subject_id in user_subjects
- Create test forums if none exist
- Check isAiVerified and validation_status flags
```

### Test 3 Fails: Not showing following users' forums

```
Symptom: Priority 3 (Users) shows 0

Check:
1. Does user follow anyone?
   SELECT COUNT(*) FROM user_follows WHERE follower_id = 'USER_ID';

2. Do those users have forums?
   SELECT f.id, f.title, f.user_id
   FROM forums f
   WHERE f.user_id IN (
     SELECT following_id FROM user_follows WHERE follower_id = 'USER_ID'
   )
   AND f.validation_status = 'approved'
   AND f.is_ai_verified = true;

3. Are forum subject_ids NOT in user's followed subjects?
   (Or they'd be Priority 2, not Priority 3)

Fix:
- Have user follow more users: POST /api/peers/{userId}/follow
- Create forums by those users in different subjects
```

### Test 4 Fails: No trending content

```
Symptom: Feed empty even though forums exist

Check:
1. Are there ANY approved + verified forums?
   SELECT COUNT(*) FROM forums
   WHERE validation_status = 'approved' AND is_ai_verified = true;

2. Are they being returned by the query?
   Run the exact query in feed_controller:
   SELECT * FROM forums WHERE validation_status = 'approved' AND is_ai_verified = true LIMIT 10;

3. Check logs for errors:
   Look for: "[STEP 3] Error fetching forums:"

Fix:
- Create test forums with correct flags
- Check that is_ai_verified is actually true (boolean)
- Verify forums exist in DB: SELECT COUNT(*) FROM forums;
```

---

## ✅ Success Criteria

All tests pass when:

- [ ] Test 1: Feed uses vector when < 30 min old
- [ ] Test 2: Feed falls back to subjects when vector missing/expired
- [ ] Test 3: Following users' forums show in correct priority
- [ ] Test 4: Trending forums show when no personal context
- [ ] Logs clearly show which priority tier is active
- [ ] Forums correctly categorized into Priority 2/3/4
- [ ] No SQL errors or RPC failures in logs
- [ ] API responds with 200 (not 500)

---

## 📞 Getting Help

If tests still fail:

1. **Run diagnostic:** `node scripts/diagnose_feed.js YOUR_USER_ID`
2. **Share output:** Post the diagnostic output showing exact data state
3. **Check logs:** Capture backend logs during API call
4. **Verify DB:** Manually query tables to confirm data exists
5. **Test endpoint:** Use Postman/curl to isolate frontend/backend issues

---

## 🔗 Related Files

- Main Implementation: `backend/app/services/forum/feed_controller.js`
- Route Definition: `backend/app/routes/forum_router.js`
- Diagnostic Script: `backend/scripts/diagnose_feed.js`
- Full Debug Guide: `DEBUG_FEED.md`
- Quick Integration: `FEED_QUICK_INTEGRATION.md`
