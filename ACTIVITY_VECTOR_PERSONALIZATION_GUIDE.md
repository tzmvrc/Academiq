# 🧠 User Activity → Interest Vector → Feed Personalization

## Overview

This system creates a **user interest vector** from user activities (saves, upvotes, comments) and uses it to **personalize the feed** by ranking similar forums higher.

```
User Activity (Save, Upvote, Comment)
         ↓
   [ActivityService logs activity]
         ↓
   [stored in user_activity table]
         ↓
[On Feed Request → computeUserInterestVector()]
         ↓
[Recent activities last 30 mins → Get embeddings → Average them]
         ↓
[Stored in user_interest_vectors table]
         ↓
[Feed Controller ranks forums by similarity to this vector]
         ↓
🎯 Personalized Feed (Most Similar Forums at Top)
```

---

## 📊 System Components

### 1. **Activity Tracking**

#### Stored in: `user_activity` table

```sql
CREATE TABLE user_activity (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  forum_id UUID REFERENCES forums(id),
  action_type VARCHAR(50) -- 'upvote', 'downvote', 'comment', 'save'
  created_at TIMESTAMP,
  metadata JSONB
);
```

#### Activities Tracked:

- **Upvote** (weight: 1.0) - Strong interest signal
- **Comment** (weight: 0.8) - Medium interest signal
- **Save** (weight: 0.6) - Low-medium interest signal
- **Downvote** (weight: -0.2) - Negative feedback (optional)

#### Where Activities are Logged:

| Action              | File                       | Function          |
| ------------------- | -------------------------- | ----------------- |
| **Upvote/Downvote** | `postVotes_controller.js`  | `voteForum()`     |
| **Save**            | `forumSaves_controller.js` | `toggleSave()`    |
| **Comment**         | `comment_controller.js`    | `createComment()` |

---

### 2. **User Interest Vector Computation**

#### Service: `userInterestService.js`

**Function**: `computeUserInterestVector(userId)`

#### Algorithm:

```
Step 1: Fetch recent activities (last 30 minutes)
   SELECT forum_id, action_type
   FROM user_activity
   WHERE user_id = :userId
   AND created_at >= NOW() - INTERVAL '30 minutes'

Step 2: Filter activities with valid embeddings
   - Get forum embeddings from database
   - Require embeddings of length 1536 (OpenAI standard)
   - Need at least 3 valid activities to create vector

Step 3: Calculate weighted sum
   For each activity:
     weight = ACTION_WEIGHTS[action_type]
     engagement_boost = 1 + min(0.5, (upvotes + comments) / 100)
     final_weight = weight * engagement_boost
     weighted_embedding += embedding * final_weight

Step 4: Normalize to unit vector
   interest_vector = weighted_sum / total_weight

Step 5: Store in database
   INSERT INTO user_interest_vectors
   (user_id, interest_vector, updated_at)
   VALUES (:userId, :vector, NOW())
```

#### Key Conditions:

- ✅ Requires **3+ activities** in last 30 minutes
- ✅ All activities must have **valid embeddings** (1536-dim)
- ✅ Returns `null` if conditions not met
- ✅ Stores result with `updated_at` timestamp

---

### 3. **Feed Ranking with Interest Vector**

#### Location: `feed_controller.js` → `getPersonalizedFeed()`

#### Integration Point:

```javascript
// STEP 0: Build user interest vector from activities (non-blocking)
computeUserInterestVector(userId).catch((err) => {
  console.warn("Vector computation failed:", err);
});

// This updates the database, then we fetch it in STEP 2
```

#### Ranking Algorithm:

Each forum gets a **combined score** from multiple signals:

1. **Vector Similarity Score** (if valid vector exists)
   - Compute cosine similarity between user interest vector and forum embedding
   - Scale to 0-100 range
   - **HIGH weight** (most important)

2. **Subject Match Score** (50 points)
   - Add 50 points if forum's subject is in user's followed subjects
   - **MEDIUM weight**

3. **Creator Follow Score** (25 points)
   - Add 25 points if forum creator is in user's following list
   - **LOWER weight**

4. **Recency Tiebreaker** (0-10 points)
   - Newer forums get slightly higher score
   - Decays over time
   - Prevents stale content from dominating

#### Scoring Code:

```javascript
const scoredForums = allForums.map((forum) => {
  let score = 0;

  // Priority 1: Vector similarity
  if (hasValidVector && vectorSimilarities.has(forum.id)) {
    const similarity = vectorSimilarities.get(forum.id);
    const vectorScore = similarity * 100;
    score += vectorScore;
  }

  // Priority 2: Subject match
  if (followedSubjects.has(forum.subject_id)) {
    score += 50;
  }

  // Priority 3: Creator follow
  if (followingUsers.has(forum.user_id)) {
    score += 25;
  }

  // Tiebreaker: Recency
  const ageInDays =
    (Date.now() - new Date(forum.created_at)) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 10 - ageInDays * 0.1);
  score += recencyScore;

  return { ...forum, feedScore: score };
});

// Sort descending (highest score first)
scoredForums.sort((a, b) => b.feedScore - a.feedScore);
```

---

## 🔄 Complete User Flow

### Scenario: User exploring AI forums

```
TIME: 00:00 - User starts browsing
  └─ User saves 2 AI forums
     └─ ActivityService.logActivityAsync() → stored in user_activity

  └─ User upvotes 1 AI forum
     └─ ActivityService.logActivityAsync() → stored in user_activity

TIME: 00:15 - User comments on 1 AI forum
  └─ ActivityService.logActivityAsync() → stored in user_activity

TIME: 00:20 - User refreshes feed
  └─ GET /api/feed/personalized

     STEP 0: computeUserInterestVector() called
     ├─ Fetch: 4 activities (2 saves, 1 upvote, 1 comment) from last 30 min
     ├─ Get embeddings for all 4 forums
     ├─ Calculate weighted average:
     │  - Save forums: 0.6x each
     │  - Upvote forum: 1.0x
     │  - Comment forum: 0.8x
     ├─ Normalize → interest_vector
     └─ Store in user_interest_vectors table

     STEP 1-4: Score and sort ALL forums
     ├─ Fetch all 500 approved forums
     ├─ For each forum:
     │  ├─ Compute cosine similarity with interest_vector
     │  ├─ Add subject/follow bonuses if applicable
     │  └─ Add recency bonus
     └─ Sort by score (highest first)

     STEP 5: Paginate
     └─ Return top 10 forums

TIME: 00:21 - Result
✅ Feed shows: AI forums ranked highest (similar to what user engaged with)
✅ Other forums still visible (just lower in feed)
```

---

## ⏱️ Vector Expiration

### 30-Minute Validity Window

```
Vector created at: 00:00
├─ Valid until: 00:30
└─ Used for personalization

After 00:30:
├─ Vector treated as expired
├─ New activities generate new vector
└─ System recomputes on next feed request
```

**Why 30 minutes?**

- Balances **freshness** (reacts to user behavior) vs **stability** (avoids noise)
- Enough time for meaningful user activity accumulation
- Typical session length on platform

---

## 🔐 Important Rules (DO NOT BREAK)

### ✅ DO:

- ✅ Always fetch **ALL** approved forums (not filtered)
- ✅ Use vector to **RANK** (not filter)
- ✅ Compute vector **non-blocking** (doesn't slow feed response)
- ✅ Log activities **asynchronously** (fire-and-forget)
- ✅ Check embedding validity (length = 1536)
- ✅ Cache vector in `user_interest_vectors` table

### ❌ DON'T:

- ❌ Filter forums by vector (return only similar ones)
- ❌ Skip pagination after ranking
- ❌ Block feed response while computing vector
- ❌ Return empty list when no vector exists
- ❌ Recompute vector multiple times in one request

---

## 📋 Implementation Checklist

- [x] **Schema**: `user_activity` table with proper indexes
- [x] **Schema**: `user_interest_vectors` table for caching
- [x] **Service**: `computeUserInterestVector()` in `userInterestService.js`
- [x] **Activity Logging**: Upvote/downvote in `postVotes_controller.js`
- [x] **Activity Logging**: Save in `forumSaves_controller.js`
- [x] **Activity Logging**: Comment in `comment_controller.js`
- [x] **Feed Integration**: Call `computeUserInterestVector()` in feed request
- [x] **Ranking**: Vector similarity scoring in feed controller
- [x] **Ranking**: Subject/follow bonuses in feed controller
- [x] **Testing**: Verify all forums returned (not filtered)
- [ ] **Testing**: Verify vector computation works
- [ ] **Testing**: Verify feed ranking changes with user activity

---

## 🧪 Testing Guide

### Test 1: Verify Vector Computation

```bash
# Script: backend/scripts/test_vector_computation.js
node scripts/test_vector_computation.js
```

**Expected output:**

```
🚀 computeUserInterestVector called for user <userId>
📊 Found 5 total activities in last 30 minutes
✅ Activities with valid embedding: 5
Loop finished. Processed 5 activities, totalWeight = X
✅ Stored interest vector for user <userId>
```

### Test 2: Verify Activity Logging

```bash
# In database:
SELECT action_type, COUNT(*)
FROM user_activity
WHERE user_id = '<userId>'
AND created_at >= NOW() - INTERVAL '30 minutes'
GROUP BY action_type;
```

**Expected output:**

```
action_type | count
upvote      |     2
comment     |     1
save        |     3
```

### Test 3: Verify Feed Ranking

```bash
# Request:
GET http://localhost:5000/api/feed/personalized?limit=20

# Expected:
1. Forums similar to user's recent activity appear first
2. ALL approved forums present in response
3. Non-similar forums still included (just lower)
4. Response includes feedScore in debug logs
```

---

## 📚 Files Modified

| File                      | Change                          | Reason                                  |
| ------------------------- | ------------------------------- | --------------------------------------- |
| `postVotes_controller.js` | Added import + activity logging | Track upvote/downvote for vector        |
| `feed_controller.js`      | Added vector computation call   | Build fresh vector on each feed request |

## 📚 Files NOT Changed (but important)

| File                       | Role                                     |
| -------------------------- | ---------------------------------------- |
| `forumSaves_controller.js` | Already logs save activities ✅          |
| `comment_controller.js`    | Already logs comment activities ✅       |
| `userInterestService.js`   | Already implements vector computation ✅ |

---

## 🐛 Debugging

### Issue: Vector not being used in feed

**Check:**

1. Is `computeUserInterestVector()` being called? (Look for logs)
2. Does user have 3+ activities in last 30 min? (Check user_activity table)
3. Do those forums have embeddings? (Check forums.embedding column)

### Issue: Same forums always appear

**Check:**

1. Is similarity scoring working? (Check vectorSimilarities.size in logs)
2. Are forums with NO vector similarity still appearing? (They should)
3. Is sort order correct? (Highest score first)

### Issue: Too few forums in feed

**Check:**

1. Are we filtering anywhere? (Should always fetch 500)
2. Are embeddings missing? (Some forums may not have them)
3. Check database query for approval status

---

## 🚀 Next Steps

1. **Deploy & Monitor**: Track vector computation success rate
2. **Tune Weights**: Adjust ACTION_WEIGHTS based on user engagement
3. **Scale**: If >100k users, consider caching embeddings in Redis
4. **Analytics**: Track % of personalized feeds actually using vectors
