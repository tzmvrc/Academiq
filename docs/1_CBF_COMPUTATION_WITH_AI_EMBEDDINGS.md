# 1. Content-Based Filtering (CBF) with AI Embeddings

## Overview

Academiq uses a **hybrid personalization system** combining semantic embeddings with traditional metadata (subjects, tags, engagement metrics). This ensures users see the most relevant academic content based on their interests and activity patterns.

---

## System Architecture

```
User Activity (View, Vote, Comment, Save)
         ↓
    ✅ Activity Logged to Database
         ↓
  📊 Extract Forum Embeddings + Engagement
         ↓
   🧮 Compute Interest Vector (Weighted Sum)
         ↓
  💾 Store in user_interest_vectors Table
         ↓
   🔁 30-Minute Cache Expiry
         ↓
  🔍 Semantic Search: get_semantic_suggestions RPC
         ↓
   📌 Combine with Subject/Tag Filtering
         ↓
  🎯 Personalized Feed Delivered to User
```

---

## Key Components

### 1. **User Interests Model**

**Table:** `user_interest_vectors`

```sql
CREATE TABLE user_interest_vectors (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  interest_vector vector(1536),        -- OpenAI embedding dimension
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_interest_vectors_updated_at
  ON user_interest_vectors(updated_at);
```

**Purpose:** Stores weighted semantic representations of user interests based on their activities.

### 2. **Forum Embeddings**

**Table:** `forums` (extended columns)

```sql
ALTER TABLE forums ADD COLUMN embedding vector(1536);

CREATE INDEX idx_forums_embedding
  ON forums USING ivfflat (embedding vector_cosine_ops);
```

**Algorithm:**

- Embeddings generated from forum title + content using OpenAI API
- Stored as 1536-dimensional vectors for semantic similarity
- Used for cosine similarity search

### 3. **Activity Logging**

**Table:** `user_activity`

```sql
CREATE TABLE user_activity (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  forum_id UUID REFERENCES forums(id),
  action_type VARCHAR(20),           -- 'view', 'upvote', 'downvote', 'comment', 'save'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user_created
  ON user_activity(user_id, created_at DESC);
```

---

## Interest Vector Computation Algorithm

### Activity Weight Configuration

```javascript
const ACTION_WEIGHTS = {
  upvote: 1.0, // Strongest signal - explicit endorsement
  comment: 0.8, // High engagement - thoughtful interaction
  save: 0.6, // Intent signal - user wants to revisit
  view: 0.3, // Weakest signal - might be passive scrolling
  downvote: -0.2, // Negative feedback
};
```

### Computation Steps

**Step 1:** Fetch recent activities (last 30 minutes)

```javascript
// File: userInterestService.js
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

const { data: activities } = await supabase
  .from("user_activity")
  .select(
    `
    action_type,
    forum_id,
    forums (
      embedding,
      upvotes_count,
      comments_count
    )
  `,
  )
  .eq("user_id", userId)
  .gte("created_at", thirtyMinutesAgo);
```

**Requirements:**

- ✅ Minimum 3 activities in last 30 minutes
- ✅ Each activity must have valid forum embedding (1536 dimensions)
- ✅ Returns null if insufficient data (fallback to traditional ranking)

---

**Step 2:** Filter valid embeddings

```javascript
const validActivities = [];

for (const act of activities) {
  if (!act.forums) continue;

  const embedding = parseEmbedding(act.forums.embedding);

  if (embedding && embedding.length === 1536) {
    act.parsedEmbedding = embedding;
    validActivities.push(act);
  }
}

// If < 3 valid activities, return null (cannot compute vector)
if (validActivities.length < 3) return null;
```

---

**Step 3:** Calculate weighted sum with engagement boost

```javascript
let weightedSum = null;
let totalWeight = 0;

for (const act of validActivities) {
  const embedding = act.parsedEmbedding;

  // Base activity weight
  let weight = ACTION_WEIGHTS[act.action_type] || 0.1;
  if (weight <= 0) continue; // Skip negative activities

  // Engagement boost: forums with more interaction get higher weight
  const engagement =
    (act.forums.upvotes_count || 0) + (act.forums.comments_count || 0);

  const boost = 1 + Math.min(0.5, engagement / 100);
  const finalWeight = weight * boost;

  // Initialize or accumulate
  if (!weightedSum) {
    weightedSum = embedding.map((v) => v * finalWeight);
  } else {
    for (let i = 0; i < embedding.length; i++) {
      weightedSum[i] += embedding[i] * finalWeight;
    }
  }

  totalWeight += finalWeight;
}
```

**Engagement Boost Formula:**

- At 0 engagement: 1.0x multiplier
- At 100 engagement: 1.5x multiplier (capped)
- Returns values between 1.0 and 1.5

---

**Step 4:** Normalize interest vector

```javascript
const interestVector = weightedSum.map((v) => v / totalWeight);

// Store in database (upsert)
await supabase.from("user_interest_vectors").upsert({
  user_id: userId,
  interest_vector: interestVector,
  updated_at: new Date().toISOString(),
});
```

**Why normalize?**

- Ensures vector components sum to 1.0
- Makes similarities comparable across different users
- Prevents weight dominance from high-engagement items

---

## Feed Ranking Algorithm

### Semantic Search Phase

**File:** `feed_controller.js`

```javascript
async getPersonalizedFeed(req, res) {
  const userId = req.user.id;

  // 1. Get cached interest vector (30-minute TTL)
  const { data: stored } = await supabase
    .from("user_interest_vectors")
    .select("interest_vector, updated_at")
    .eq("user_id", userId)
    .single();

  const vectorAgeMinutes = stored?.updated_at
    ? (Date.now() - new Date(stored.updated_at).getTime()) / (1000 * 60)
    : Infinity;

  let userVector = null;

  if (stored?.interest_vector && vectorAgeMinutes < 30) {
    // Use cached vector
    userVector = stored.interest_vector;
  } else {
    // Recompute vector
    userVector = await computeUserInterestVector(userId);
  }

  // 2. Get semantic suggestions (if vector exists)
  let candidateForums = [];

  if (userVector) {
    const { data: similar } = await supabase.rpc(
      "get_semantic_suggestions",
      {
        query_vector: userVector,
        max_results: 200
      }
    );

    candidateForums = similar || [];
  }

  // 3. Fallback: Traditional ranking (if no vector or no results)
  if (candidateForums.length === 0) {
    const { data } = await supabase
      .from("forums")
      .select("*")
      .eq("validation_status", "approved")
      .eq("is_ai_verified", true)
      .order("upvotes_count", { ascending: false })
      .limit(200);

    candidateForums = data || [];
  }

  return res.json({
    forums: candidateForums.slice(offset, offset + limit),
    hasMore: offset + limit < candidateForums.length,
    total: candidateForums.length
  });
}
```

---

### Subject & Tag-Based Filtering

**Applied before semantic search:**

```javascript
// Option 1: Filter by specific subject
if (subjectId) {
  candidateForums = candidateForums.filter((f) => f.subject_id === subjectId);
}

// Option 2: Filter by specific tag
if (tagId) {
  const { data: forumIds } = await supabase
    .from("forum_tags")
    .select("forum_id")
    .eq("tag_id", tagId);

  const filteredIds = new Set(forumIds.map((ft) => ft.forum_id));
  candidateForums = candidateForums.filter((f) => filteredIds.has(f.id));
}
```

---

## Prioritization Rules

### 1. **Semantic Similarity (Primary)**

Uses cosine distance from user's interest vector to forum embedding:

$$\text{similarity} = \frac{\vec{u} \cdot \vec{f}}{|\vec{u}| \times |\vec{f}|}$$

- Range: -1.0 (opposite) to 1.0 (identical)
- Ranked by similarity descending

### 2. **Engagement Metrics (Secondary)**

When semantic score is similar, break ties using:

```javascript
const engagementScore =
  forum.upvotes_count * 2.0 +
  forum.comments_count * 1.5 +
  forum.downvotes_count * -1.0;
```

### 3. **Recency Boost (Tertiary)**

Newer forums get a decay-based boost:

```javascript
const ageInHours =
  (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

// Decay from 1.5x (0 hours) to 1.0x (7 days)
const maxAgeHours = 7 * 24;
const boost = Math.max(1.0, 1.5 - (ageInHours / maxAgeHours) * 0.5);
```

**Effect:**

- New posts get 50% more weight initially
- Decays linearly over 7 days
- After 7 days, no recency boost

### 4. **Subject/Tag Hard Filter (Highest Priority)**

If user specifies subject or tag, **only those forums are shown** (overrides semantic search).

---

## Fallback Strategy

```
┌─────────────────────────────────────────┐
│   Try Semantic Search with Vector       │
│   (if vector exists & < 30 min old)     │
└────────────┬────────────────────────────┘
             │
         ✅ Results found?
         ↙            ↘
      YES              NO
       ↓                ↓
   Return        ┌─────────────────────┐
                 │ Fall back to:        │
                 │ - Recent forums      │
                 │ - High engagement    │
                 │ - Trending subjects  │
                 └─────────────────────┘
```

---

## Database RPC Function

**File:** Supabase SQL

```sql
CREATE OR REPLACE FUNCTION get_semantic_suggestions(
  query_vector vector,
  max_results INT DEFAULT 200
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  user_id UUID,
  subject_id UUID,
  embedding vector,
  upvotes_count INT,
  downvotes_count INT,
  comments_count INT,
  validation_status VARCHAR,
  is_ai_verified BOOLEAN,
  created_at TIMESTAMP,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.title,
    f.content,
    f.user_id,
    f.subject_id,
    f.embedding,
    f.upvotes_count,
    f.downvotes_count,
    f.comments_count,
    f.validation_status,
    f.is_ai_verified,
    f.created_at,
    (1 - (f.embedding <=> query_vector))::FLOAT as similarity
  FROM forums f
  WHERE
    f.validation_status = 'approved'
    AND f.is_ai_verified = true
    AND f.embedding IS NOT NULL
  ORDER BY f.embedding <=> query_vector
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;
```

---

## Performance Considerations

| Metric               | Value            | Notes                      |
| -------------------- | ---------------- | -------------------------- |
| **Cache TTL**        | 30 minutes       | Recompute if stale         |
| **Min Activities**   | 3 in last 30 min | Below threshold → fallback |
| **Vector Dimension** | 1536             | OpenAI embedding standard  |
| **Embedding Index**  | IVFFlat          | Fast approximate search    |
| **Query Time**       | ~10-50ms         | Depends on forum count     |
| **Storage/User**     | ~12KB            | 1536 floats × 4 bytes      |

---

## Example Workflow

**User Activity Timeline:**

```
14:00 - View "Calculus: Integration Techniques"
        └─ embedding=[0.12, 0.34, 0.56, ...] (1536 dims)
        └─ engagement=45 (3 comments + 2 upvotes)
        └─ weight = 0.3 (view) × 1.45 (boost) = 0.435

14:15 - Comment on "Derivatives in Physics"
        └─ embedding=[0.15, 0.31, 0.59, ...] (1536 dims)
        └─ engagement=120 (10 comments + 5 upvotes)
        └─ weight = 0.8 (comment) × 1.5 (capped) = 1.2

14:25 - Upvote "Advanced Integration Methods"
        └─ embedding=[0.11, 0.35, 0.55, ...] (1536 dims)
        └─ engagement=10 (1 comment + 2 upvotes)
        └─ weight = 1.0 (upvote) × 1.1 (boost) = 1.1

14:35 - Request Feed
        └─ Activities: 3 ✅ (meets minimum)
        └─ Interest Vector computed = weighted average of 3 embeddings
        └─ Semantic search finds similar forums
        └─ Ranked by: similarity → engagement → recency
```

---

## Implementation Checklist

- ✅ `user_activity` table with indexes
- ✅ `user_interest_vectors` table with pgvector extension
- ✅ Forum embeddings generated via OpenAI API
- ✅ `IVFFlat` index on forum embeddings
- ✅ `get_semantic_suggestions()` RPC function
- ✅ `userInterestService.js` computation logic
- ✅ `feed_controller.js` integration
- ✅ 30-minute vector cache TTL
- ✅ Fallback to traditional ranking
- ⚠️ A/B testing on engagement metrics weighting
- ⚠️ Monitor vector computation latency

---

## Related Systems

- **Activity Logging:** `activity_service.js`
- **Feed Ranking:** `feed_controller.js:getPersonalizedFeed()`
- **User Interests Model:** `user_interests_model.js`
- **Trending Computation:** See doc #5
