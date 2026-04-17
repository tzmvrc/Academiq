# 5. Trending Academiq Discussion Computation & Requirements

## Overview

Academiq computes **trending academic discussions** (subjects & tags) based on:

- **Activity volume** (how many posts published)
- **Engagement metrics** (upvotes, comments, saves)
- **Recency decay** (time-weighted to prioritize recent activity)
- **Quality filters** (only approved & verified posts)

This document explains the trending algorithm, computation requirements, and system dependencies.

---

## High-Level Architecture

```
Academic Content
(Forums, Comments, Tags, Subjects)
         ↓
📊 COLLECT METRICS
├─ Posts created (last 7 days)
├─ Engagement: upvotes + comments
├─ Time since creation
└─ Quality: approved + verified
         ↓
🔢 CALCULATE SCORES
├─ Engagement Score = (upvotes × 2) + (comments × 1.5) + (downvotes × -1)
├─ Recency Boost = 1.5x (fresh) → 1.0x (7 days old)
├─ Quality Filter = approved AND is_ai_verified
└─ Combined Score = engagement × recency
         ↓
🎯 RANK & AGGREGATE
├─ By Subject (count discussions)
├─ By Tag (count discussions)
├─ By Global Trends (top items)
└─ Apply time-based decay
         ↓
💾 STORE RESULTS
├─ Cache in-memory (5 min refresh)
├─ Or compute on-demand
└─ Serve via API endpoints
         ↓
🌐 DISPLAY
├─ Frontend trending carousel
├─ Topic suggestions
└─ Discovery feeds
```

---

## System Architecture

### Three Computation Approaches

#### Approach 1: On-Demand Computation

```javascript
// File: activity_service.js:getTrendingForums()

async getTrendingForums(limit = 10, days = 7) {
  // Compute fresh on each request
  const cutoffDate = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data } = await supabase
    .from("forums")
    .select(`
      *,
      user:user_id(id, name, profile_url, school),
      subject:subject_id(id, name),
      forum_tags(tag:tag_id(id, name, slug))
    `)
    .gte("created_at", cutoffDate)
    .eq("validation_status", "approved")
    .eq("is_ai_verified", true)
    .order("upvotes_count", { ascending: false })
    .limit(limit);

  return data || [];
}
```

**Pros:**

- ✅ Always fresh data
- ✅ No cache invalidation needed
- ✅ Simple implementation

**Cons:**

- ❌ Slower response (1-2s per request)
- ❌ Database load on popular endpoints
- ❌ Not suitable for high-traffic sites

---

#### Approach 2: Cached with TTL

```javascript
// File: subject_service.js:getTrendingTopics() with Redis

const CACHE_KEY = "trending:topics:18";
const CACHE_TTL = 5 * 60;  // 5 minutes

async getTrendingTopics(limit = 18) {
  // 1. Try cache first
  const cached = await redis.get(CACHE_KEY);
  if (cached) {
    console.log(`✅ Returning cached trending topics`);
    return JSON.parse(cached);
  }

  // 2. Compute if cache miss
  console.log(`🔄 Cache miss – computing trending topics...`);

  const topics = await computeTrendingTopics(limit);

  // 3. Store in cache
  await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(topics));

  return topics;
}
```

**Pros:**

- ✅ Fast responses (< 100ms from cache)
- ✅ Reasonable freshness (5 min old)
- ✅ Reduced database load

**Cons:**

- ⚠️ Slightly stale data possible
- ⚠️ Requires Redis infrastructure
- ⚠️ Cache invalidation complexity

---

#### Approach 3: Scheduled Background Computation

```javascript
// File: cron job in scheduler

// Every 5 minutes, recompute and update a materialized view
schedule.scheduleJob("*/5 * * * *", async () => {
  console.log(`🔄 Recomputing trending topics...`);

  const topics = await computeTrendingTopics(18);

  // Store in database table
  await supabase.from("trending_cache").upsert({
    key: "topics_18",
    data: topics,
    computed_at: new Date().toISOString(),
  });

  console.log(`✅ Trending cache updated`);
});
```

**Pros:**

- ✅ Fastest responses (pre-computed)
- ✅ Predictable performance
- ✅ Works without Redis

**Cons:**

- ❌ Always N minutes old
- ❌ Extra storage needed
- ❌ Requires background job infrastructure

---

## Scoring Algorithm

### 1. Engagement Score

```javascript
calculateEngagementScore(forum) {
  // Weighted combination of interactions
  const upvoteWeight = 2.0;        // Upvotes valued most
  const downvoteWeight = -1.0;     // Downvotes penalize
  const commentWeight = 1.5;       // Comments show discussion

  const score =
    (forum.upvotes_count || 0) * upvoteWeight +
    (forum.downvotes_count || 0) * downvoteWeight +
    (forum.comments_count || 0) * commentWeight;

  // Floor at 0 (no negative engagement)
  return Math.max(0, score);
}

// Example:
forum = { upvotes: 10, downvotes: 2, comments: 5 }
engagement = (10 × 2) + (2 × -1) + (5 × 1.5)
           = 20 - 2 + 7.5
           = 25.5
```

**Weightings Rationale:**

- **Upvotes (2x):** Direct quality endorsement, most valuable
- **Comments (1.5x):** Indicates active discussion, secondary signal
- **Downvotes (-1x):** Quality penalty, soft negative signal

---

### 2. Recency Boost

```javascript
calculateRecencyBoost(createdAt) {
  const ageInHours =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

  // Decay function:
  // 1.5x at 0 hours → 1.0x at 168 hours (7 days)
  const maxAgeHours = 7 * 24;  // 168 hours
  const boost = Math.max(
    1.0,                              // Floor at 1.0x
    1.5 - (ageInHours / maxAgeHours) * 0.5
  );

  return boost;
}

// Examples:
age = 0 hours    → boost = 1.5x (brand new!)
age = 84 hours   → boost = 1.25x (3.5 days old)
age = 168 hours  → boost = 1.0x (exactly 7 days)
age = 240 hours  → boost = 1.0x (>7 days, clamped)
```

**Decay Formula:**

$$\text{boost}(t) = \max\left(1.0, 1.5 - \frac{t}{168} \times 0.5\right)$$

Where $t$ = age in hours

**Effect:**

- New posts get 50% boost
- Boost decays linearly over 7 days
- After 7 days, no boost (1.0x)
- Prevents old content from permanently dominating

---

### 3. Combined Trending Score

```javascript
calculateTrendingScore(forum) {
  const engagement = this.calculateEngagementScore(forum);
  const recency = this.calculateRecencyBoost(forum.created_at);

  // Combine: engagement × recency boost
  const trendingScore = engagement * recency;

  return trendingScore;
}

// Example:
forum = {
  upvotes: 10,
  downvotes: 2,
  comments: 5,
  created_at: 12 hours ago
}

engagement = (10 × 2) - (2 × 1) + (5 × 1.5) = 25.5
recency = 1.5 - (12 / 168) × 0.5 = 1.464
trending_score = 25.5 × 1.464 = 37.33
```

---

### 4. Quality Filters (Hard Requirements)

```sql
WHERE validation_status = 'approved'
  AND is_ai_verified = true
  AND created_at >= NOW() - INTERVAL '7 days'
```

**Quality Criteria:**

1. ✅ `validation_status = "approved"` - Passed AI content check
2. ✅ `is_ai_verified = true` - Verified by AI system
3. ✅ Created within last 7 days - Relevant timeframe

**Effect:** Only high-quality, recently-posted content shown

---

## Database Queries

### Get Trending Forums

```sql
SELECT
  f.id,
  f.title,
  f.upvotes_count,
  f.downvotes_count,
  f.comments_count,
  f.created_at,
  f.subject_id,
  (
    COUNT(DISTINCT ft.tag_id)
  ) as tag_count,
  (
    (f.upvotes_count * 2.0) +
    (f.downvotes_count * -1.0) +
    (f.comments_count * 1.5)
  ) as engagement_score,
  (
    1.5 - (
      (EXTRACT(EPOCH FROM (NOW() - f.created_at)) / 3600.0) / 168.0
    ) * 0.5
  ) as recency_boost,
  (
    (
      (f.upvotes_count * 2.0) +
      (f.downvotes_count * -1.0) +
      (f.comments_count * 1.5)
    ) * (
      1.5 - (
        (EXTRACT(EPOCH FROM (NOW() - f.created_at)) / 3600.0) / 168.0
      ) * 0.5
    )
  ) as trending_score
FROM forums f
LEFT JOIN forum_tags ft ON f.id = ft.forum_id
WHERE
  f.validation_status = 'approved'
  AND f.is_ai_verified = true
  AND f.created_at >= NOW() - INTERVAL '7 days'
GROUP BY f.id, f.title, f.upvotes_count, f.downvotes_count,
         f.comments_count, f.created_at, f.subject_id
ORDER BY trending_score DESC
LIMIT 20;
```

---

### Get Trending Subjects/Topics

**File:** `subject_model.js:getTrendingTopics()`

```javascript
async getTrendingTopics(limit = 18) {
  // 1. Get subjects with count of approved & verified forums
  const { data: subjects } = await supabase
    .from("forums")
    .select("subject_id, subjects(id, name)", { count: "exact" })
    .eq("validation_status", "approved")
    .eq("is_ai_verified", true)
    .not("subject_id", "is", null);

  // Aggregate counts per subject
  const subjectCountMap = new Map();
  subjects?.forEach((forum) => {
    const subject = forum.subjects;
    if (subject && subject.id) {
      const existing = subjectCountMap.get(subject.id) || {
        id: subject.id,
        name: subject.name,
        count: 0
      };
      existing.count += 1;
      subjectCountMap.set(subject.id, existing);
    }
  });

  const subjectsFormatted = Array.from(subjectCountMap.values())
    .map(s => ({
      id: s.id,
      name: s.name,
      type: "subject",
      discussionCount: s.count
    }))
    .sort((a, b) => b.discussionCount - a.discussionCount)
    .slice(0, limit / 2);  // Split limit between subjects & tags

  // 2. Get tags with count
  const { data: tagsWithCount } = await supabase
    .from("forum_tags")
    .select(
      "tag_id, tags(id, name), forums!inner(validation_status, is_ai_verified)"
    )
    .eq("forums.validation_status", "approved")
    .eq("forums.is_ai_verified", true);

  const tagCountMap = new Map();
  tagsWithCount?.forEach((ft) => {
    const tag = ft.tags;
    if (tag && tag.id) {
      const existing = tagCountMap.get(tag.id) || {
        id: tag.id,
        name: tag.name,
        count: 0
      };
      existing.count += 1;
      tagCountMap.set(tag.id, existing);
    }
  });

  const tagsFormatted = Array.from(tagCountMap.values())
    .map(t => ({
      id: t.id,
      name: t.name,
      type: "tag",
      discussionCount: t.count
    }))
    .sort((a, b) => b.discussionCount - a.discussionCount)
    .slice(0, limit / 2);

  // 3. Combine and sort by discussion count
  const combined = [...subjectsFormatted, ...tagsFormatted]
    .sort((a, b) => b.discussionCount - a.discussionCount)
    .slice(0, limit);

  return combined;
}
```

---

## Implementation Examples

### Example 1: Trending Forums Endpoint

**File:** `activity_service.js`

```javascript
async getTrendingForums(limit = 10, days = 7) {
  try {
    const cutoffDate = new Date(
      Date.now() - days * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from("forums")
      .select(`
        *,
        user:user_id(id, name, profile_url, school),
        subject:subject_id(id, name),
        forum_tags(tag:tag_id(id, name, slug))
      `)
      .gte("created_at", cutoffDate)
      .eq("validation_status", "approved")
      .eq("is_ai_verified", true)
      .order("upvotes_count", { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Client-side scoring (if not done in SQL)
    const scored = data?.map(forum => ({
      ...forum,
      tags: (forum.forum_tags || []).map(ft => ft.tag).filter(Boolean),
      engagement_score: this.calculateEngagementScore(forum),
      recency_boost: this.calculateRecencyBoost(forum.created_at),
      trending_score:
        this.calculateEngagementScore(forum) *
        this.calculateRecencyBoost(forum.created_at)
    })) || [];

    // Sort by trending score
    scored.sort((a, b) => b.trending_score - a.trending_score);

    return scored;
  } catch (err) {
    console.error("Error fetching trending forums:", err);
    return [];
  }
}
```

---

### Example 2: Trending Topics Endpoint

**File:** `subject_controller.js`

```javascript
async getTrendingTopics(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 18;

    // Get trending topics (cached or computed)
    const topics = await SubjectModel.getTrendingTopics(limit);

    // Log trending topic request
    console.log(`📊 Returned ${topics.length} trending topics`);

    // Set cache headers for browser caching
    res.setHeader("Cache-Control", "public, max-age=300");  // 5 minutes

    return res.json({ topics });
  } catch (err) {
    console.error("Trending topics error:", err);
    return res.status(500).json({ error: "Failed to fetch trending topics" });
  }
}
```

---

## Performance Optimization

### Database Indexes

```sql
-- Index for quality filtering
CREATE INDEX idx_forums_validation_verified
  ON forums(validation_status, is_ai_verified, created_at DESC);

-- Index for recency sorting
CREATE INDEX idx_forums_created_at_desc
  ON forums(created_at DESC);

-- Index for engagement sorting
CREATE INDEX idx_forums_engagement
  ON forums(upvotes_count DESC, comments_count DESC, created_at DESC);

-- Index for tag aggregation
CREATE INDEX idx_forum_tags_forum_id
  ON forum_tags(forum_id);
```

### Query Optimization

**Before (Slow):**

```sql
SELECT f.* FROM forums f
WHERE f.validation_status = 'approved'
ORDER BY (upvotes_count * 2 + comments_count * 1.5) DESC;
-- ❌ Can't use index, compute on every row
```

**After (Fast):**

```sql
SELECT f.* FROM forums f
WHERE
  f.validation_status = 'approved'
  AND f.is_ai_verified = true
ORDER BY f.upvotes_count DESC, f.comments_count DESC
LIMIT 50;
-- ✅ Uses composite index, respects quality filters
-- Client computes final score if needed
```

### Caching Strategy

```javascript
// Redis cache with TTL
const TRENDING_CACHE = {
  "trending:forums:10": { ttl: 300 }, // 5 min
  "trending:topics:18": { ttl: 300 },
  "trending:subjects": { ttl: 600 }, // 10 min
};
```

---

## Real-Time Updates

### Event-Driven Recalculation

```javascript
// When post receives upvote
POST /forums/:id/vote
  ├─ Update upvotes_count
  └─ Emit "forum:upvoted" event
      └─ Trigger trending recalculation
          ├─ Invalidate cache
          └─ Recompute trending score

// Socket.IO listener
io.on("forum:upvoted", async (forumId) => {
  // Clear relevant cache keys
  await redis.del("trending:forums:10");
  await redis.del("trending:forums:20");

  // Notify connected clients
  io.emit("trending:updated", await getTrendingForums(10));
});
```

---

## Requirements & Dependencies

### Infrastructure

| Component    | Requirement                 | Purpose                            |
| ------------ | --------------------------- | ---------------------------------- |
| **Database** | PostgreSQL with pgvector    | Store forums, compute queries      |
| **Cache**    | Redis (optional)            | Cache trending results (5 min TTL) |
| **Search**   | Full-text search (optional) | Featured search on trending topics |
| **Backend**  | Node.js with socket.io      | Real-time trending updates         |
| **Frontend** | React with hooks            | Display trending carousel          |

### Database Tables Required

```
✅ forums
  ├─ id, title, content
  ├─ upvotes_count, downvotes_count, comments_count
  ├─ validation_status, is_ai_verified
  ├─ created_at
  └─ subject_id

✅ subjects
  ├─ id, name
  └─ created_at

✅ forum_tags & tags
  ├─ forum_id, tag_id
  └─ tag.name

✅ user_activity (optional, for advanced metrics)
  ├─ user_id, forum_id, action_type
  └─ created_at
```

### API Endpoints

```
GET /api/forums/trending
  ├─ Query params: limit?=10, days?=7
  └─ Returns: [{ id, title, engagement_score, recency_boost, trending_score, ... }]

GET /api/subjects/trending
  ├─ Query params: limit?=18
  └─ Returns: [{ id, name, type, discussionCount }]

GET /api/forums/trending/tags
  ├─ Query params: limit?=10
  └─ Returns: [{ id, name, type, discussionCount }]
```

---

## Monitoring & Analytics

### Metrics to Track

```javascript
// Trending computation performance
const startTime = Date.now();
const trending = await getTrendingForums(10);
const computeTime = Date.now() - startTime;
console.log(`Trending computation took ${computeTime}ms`);

// Cache hit ratio
const cacheHits = (await redis.get("trending:cache:hits")) || 0;
const cacheMisses = (await redis.get("trending:cache:misses")) || 0;
const hitRatio = cacheHits / (cacheHits + cacheMisses);
console.log(`Cache hit ratio: ${(hitRatio * 100).toFixed(2)}%`);

// Trending diversity
const subjects = new Set(trending.map((f) => f.subject_id)).size;
const tags = new Set(trending.flatMap((f) => f.forum_tags.map((t) => t.tag_id)))
  .size;
console.log(`Topics covered: ${subjects} subjects, ${tags} tags`);
```

### Dashboards

```
📊 Trending Dashboard:
  ├─ Top 20 forums (24h, 7d, 30d)
  ├─ Top 10 subjects
  ├─ Top 10 tags
  ├─ Engagement trends (upvotes/day)
  ├─ Recency distribution
  └─ Query latency (p50, p95, p99)
```

---

## Example Workflow

### Scenario: New Post Gets Trending

```
14:00 - User posts "Quantum Computing Basics" (Math subject, "physics", "algorithm" tags)
        └─ validation_status: "pending"

14:30 - AI validates and approves post
        └─ validation_status: "approved"
        └─ is_ai_verified: true

15:00 - 5 users upvote, 3 users comment
        ├─ upvotes_count: 5
        ├─ comments_count: 3
        └─ Engagement Score: (5 × 2) + (3 × 1.5) = 14.5

15:30 - Trending recomputed (cache refresh)
        ├─ Age: 1.5 hours
        ├─ Recency Boost: 1.5 - (1.5/168) × 0.5 = 1.496
        ├─ Trending Score: 14.5 × 1.496 = 21.69
        └─ Ranked #14 in trending forums (out of 200)

16:00 - 10 more upvotes, now at #3
        ├─ Engagement Score: (15 × 2) + (3 × 1.5) = 34.5
        ├─ Recency Boost: 1.494
        ├─ Trending Score: 34.5 × 1.494 = 51.54
        └─ Featured in trending carousel on frontend
```

---

## Implementation Checklist

- ✅ Engagement score formula
- ✅ Recency boost formula
- ✅ Quality filters (approved + verified)
- ✅ Trending forums endpoint
- ✅ Trending subjects endpoint
- ✅ Trending tags endpoint
- ✅ Database indexes for performance
- ✅ Cache invalidation on vote/comment
- ⚠️ Redis cache layer (optional)
- ⚠️ Real-time trending via Socket.IO
- ⚠️ Analytics dashboard
- ⚠️ A/B testing different weightings

---

## Related Systems

- **Engagement Metrics:** activity_service.js
- **Content Quality:** Post & comment validation (docs #2, #3)
- **Real-time Events:** Socket.IO middleware
- **Notifications:** notification_service.js (notify trending changes)
- **UI Components:** Trending carousel, topic suggestions
