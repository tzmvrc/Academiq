# Forum Embedding + Personalized Feed Implementation Guide

## Overview

This implementation adds AI-based vector embeddings for forums and a personalized feed system that learns from user activity to provide intelligent forum recommendations.

## Architecture

### Part 1: Forum Embeddings

**Flow:**

```
User creates forum → AI validation → If approved:
  1. Save forum to database ✅ (returns immediately)
  2. Generate embedding async (non-blocking) ✅
  3. Save embedding to forums.embedding column ✅
```

**Files:**

- `backend/app/utils/embedding_service.js` - DeepSeek API integration
- `backend/app/models/forum_model.js` - `saveEmbedding()`, `getEmbedding()` methods
- `backend/app/services/forum/forum_controller.js` - Modified `createForum()` to trigger async embedding

**Key Implementation:**

```javascript
// After forum approval, generate embedding async (non-blocking)
if (validation.verdict === "approved") {
  setImmediate(async () => {
    const embedding = await generateForumEmbedding(forum.title, forum.content);
    await ForumModel.saveEmbedding(forum.id, embedding);
    // Invalidate user's interest vector to trigger recompute
    await UserModel.invalidateInterestVector(userId);
  });
}
```

### Part 2: User Activity Tracking

**Tracked Actions:**

- `upvote` - User upvoted a forum
- `downvote` - User downvoted a forum
- `comment` - User commented on a forum
- `save` - User saved a forum
- `view` - User viewed a forum (optional)

**Files:**

- `backend/app/models/user_activity_model.js` - Activity logging and retrieval
- `backend/app/services/activity_service.js` - Already logs activities (integrated)
- `backend/migrations/20260418_forum_embeddings_and_interest_vectors.sql` - Schema

**Activity Recording:**

```javascript
// Already implemented in voteForum, save handlers, etc.
ActivityService.logActivityAsync(userId, forumId, "upvote", {
  title: forum.title,
  tags: forum.tags,
  subject: forum.subject,
});
```

### Part 3: Interest Vector Computation

**Process:**

1. Fetch user's recent activities (last 24 hours, configurable)
2. Get embeddings for forums related to those activities
3. Combine embeddings using weighted average:
   - upvote: weight 2
   - save: weight 2
   - comment: weight 1
   - downvote: weight -0.5
4. Store in `user_interest_vectors` table with timestamp

**Files:**

- `backend/app/models/user_model.js` - `computeInterestVector()`, `getOrComputeInterestVector()`
- `backend/app/utils/vector_utils.js` - `weightedAverageVectors()`, `cosineSimilarity()`

**Implementation:**

```javascript
// Get or compute user's interest vector (cached for 30 minutes)
const vector = await UserModel.getOrComputeInterestVector(userId);

// If stale or missing, compute:
const vector = await UserModel.computeInterestVector(userId);

// Manually recompute (invalidate old)
await UserModel.invalidateInterestVector(userId);
```

### Part 4: Personalized Feed Ranking

**Priority System:**

1. **User Interest Vector** (AI-based personalization)
   - Use cosine similarity to rank forums
   - Threshold: 0.5 minimum similarity
2. **Followed Subjects** (newest first)
   - If no interest vector, fallback
3. **Followed Users' Forums** (newest first)
   - If still no data, fallback
4. **Trending Forums** (all users)
   - Last resort fallback

**Files:**

- `backend/app/services/forum/feed_controller.js` - `getPersonalizedFeed()` (already implemented)

**Ranking Logic:**

```javascript
// If user has a vector, get similar forums
if (userVector) {
  const similarForums = await supabase.rpc("get_semantic_suggestions", {
    query_vector: userVector,
    max_results: 200,
  });
}

// If no vector or no results, fallback to traditional ranking
if (!userVector || candidateForums.length === 0) {
  // Fetch followed subjects, then followed users
  // Fallback to trending
}
```

### Part 5: Vector Expiration & Refresh

**30-Minute Expiry:**

```javascript
// On each feed fetch:
const vectorAgeMinutes = (now - lastUpdated) / (1000 * 60);

if (vectorAgeMinutes < 30 && vector exists) {
  // Use cached vector
} else {
  // Recompute from recent activities
}
```

**API Endpoint to Force Refresh:**

```
POST /api/interest-vectors/me/recompute
```

## Database Schema

### forums table (updated)

```sql
ALTER TABLE forums ADD COLUMN embedding JSONB;
CREATE INDEX forums_embedding_idx ON forums USING gin(embedding);
```

### users table (updated)

```sql
ALTER TABLE users ADD COLUMN interest_vector JSONB;
ALTER TABLE users ADD COLUMN interest_vector_updated_at TIMESTAMP;
```

### user_activity table (new)

```sql
CREATE TABLE user_activity (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  forum_id UUID REFERENCES forums(id) ON DELETE CASCADE,
  action_type VARCHAR(50), -- 'upvote', 'downvote', 'comment', 'save'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

CREATE INDEX user_activity_user_id_idx ON user_activity(user_id);
CREATE INDEX user_activity_created_at_idx ON user_activity(created_at DESC);
```

### user_interest_vectors table (new)

```sql
CREATE TABLE user_interest_vectors (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  interest_vector JSONB,
  updated_at TIMESTAMP,
  created_at TIMESTAMP
);

CREATE INDEX user_interest_vectors_user_id_idx ON user_interest_vectors(user_id);
```

## API Endpoints

### Interest Vector Endpoints

**Get current user's interest vector:**

```
GET /api/interest-vectors/me
Response:
{
  "user_id": "...",
  "interest_vector": [0.1, 0.2, ...],
  "timestamp": "2026-04-18T..."
}
```

**Force recompute interest vector:**

```
POST /api/interest-vectors/me/recompute
Response:
{
  "user_id": "...",
  "interest_vector": [...],
  "status": "recomputed"
}
```

**Invalidate interest vector (force recompute on next fetch):**

```
DELETE /api/interest-vectors/me
Response:
{
  "user_id": "...",
  "status": "invalidated",
  "success": true
}
```

**Get activity statistics:**

```
GET /api/interest-vectors/stats
Response:
{
  "user_id": "...",
  "activity_count": 45,
  "stats": {
    "upvote": 20,
    "downvote": 5,
    "comment": 10,
    "save": 10
  },
  "window_minutes": 1440
}
```

### Feed Endpoint

**Get personalized feed:**

```
GET /api/forums/feed?limit=10&offset=0
Response:
{
  "forums": [...],
  "hasMore": true,
  "total": 250
}
```

## Vector Operations

### Cosine Similarity

```javascript
import { cosineSimilarity } from "./vector_utils.js";

const similarity = cosineSimilarity(vec1, vec2);
// Returns -1 to 1 (1 = identical vectors)
```

### Weighted Average

```javascript
import { weightedAverageVectors } from "./vector_utils.js";

const combined = weightedAverageVectors(activitiesWithEmbeddings, {
  upvote: 2,
  save: 2,
  comment: 1,
  downvote: -0.5,
});
```

### Vector Normalization

```javascript
import { normalizeVector } from "./vector_utils.js";

const normalized = normalizeVector(vector);
// Returns unit vector (magnitude = 1)
```

## Background Jobs

### Batch Embedding Generation

Generate embeddings for all forums that don't have them:

```javascript
import { processForumsWithoutEmbeddings } from "./services/jobs/embedding_generation_job.js";

// Process in batches of 10, with 500ms delay
await processForumsWithoutEmbeddings(10, 500);
```

**Setup with node-cron (optional):**

```javascript
import cron from "node-cron";
import { embeddingGenerationJobScheduled } from "./services/jobs/embedding_generation_job.js";

// Run daily at 2:00 AM
cron.schedule("0 2 * * *", embeddingGenerationJobScheduled);
```

## Environment Variables

Add to `.env`:

```
# DeepSeek API
DEEPSEEK_API_URL=http://localhost:8000/ai

# Or use Gemini
GEMINI_API_KEY=your_gemini_key
```

## Migration Steps

1. **Apply Database Schema:**

   ```sql
   -- Run the migration file
   psql -U user -d database -f migrations/20260418_forum_embeddings_and_interest_vectors.sql
   ```

2. **Generate Existing Embeddings (optional):**

   ```bash
   # Run batch job to embed existing forums
   node scripts/generate_embeddings.js
   ```

3. **Start the Backend:**
   ```bash
   npm run dev
   ```

## Flow Diagrams

### Forum Creation & Embedding Flow

```
User submits forum
    ↓
AI validates (blocks)
    ↓
If approved:
  ├─ Save to DB (immediate)
  ├─ Return response (202 Accepted)
  └─ async: Generate embedding
              ├─ Call DeepSeek API
              ├─ Save to forums.embedding
              └─ Invalidate user's interest vector
```

### Interest Vector Computation Flow

```
Feed request arrives
    ↓
Check user_interest_vectors table
    ├─ Vector exists AND < 30 min old?
    │  └─ Use cached vector
    └─ Vector missing or stale?
       └─ Compute new:
          ├─ Fetch user's recent activities (24h)
          ├─ Get forum embeddings for activities
          ├─ Combine with weighted average
          ├─ Save to user_interest_vectors
          └─ Return vector
    ↓
Use vector to rank forums (cosine similarity)
    ↓
Return top N forums
```

### Feed Ranking Priority

```
User requests feed
    ↓
Get user's interest vector
    ├─ Vector exists?
    │  ├─ YES → Search semantically similar forums
    │  │         Sort by cosine similarity DESC
    │  └─ NO → Fallback
    │
    └─ Fallback Chain:
       ├─ 1. Forums from followed subjects (newest first)
       ├─ 2. Forums from followed users (newest first)
       └─ 3. Trending forums (last 30 days, by engagement)
    ↓
Apply pagination (limit, offset)
    ↓
Return paginated results
```

## Performance Considerations

### Optimization Tips

1. **Batch Embedding Generation:**
   - Generate embeddings for multiple forums at once
   - Batch size: 5-10 forums, 500ms-1s delay between batches
   - Use background jobs (cron) instead of real-time

2. **Interest Vector Caching:**
   - 30-minute TTL reduces computation overhead
   - Cached computation saves API calls
   - Invalidate on new activity for real-time personalization

3. **Vector Similarity Search:**
   - Use PostgreSQL `pgvector` extension for native similarity (future improvement)
   - Current JS-based cosine similarity is sufficient for < 10K forums
   - Consider approximate nearest neighbor search for scaling

4. **Database Indexes:**
   - Add indexes on `user_activity(user_id)`, `user_activity(created_at)`
   - Add index on `forums.embedding` for fast lookups
   - Indexes on `user_interest_vectors(user_id)`

### Scaling Strategy

**Phase 1 (Current):**

- JS-based cosine similarity
- In-memory vector computation
- Suitable for < 50K forums

**Phase 2 (Future):**

- PostgreSQL `pgvector` extension
- Native similarity search in SQL
- Batch processing with Bull/Bee-Q

**Phase 3 (Future):**

- Vector database (Pinecone, Weaviate, Milvus)
- Approximate nearest neighbor (ANN) search
- Real-time updates via webhooks

## Testing

### Test Interest Vector Computation

```bash
# Get current interest vector
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/interest-vectors/me

# Force recompute
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/interest-vectors/me/recompute

# Get activity stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/interest-vectors/stats
```

### Test Personalized Feed

```bash
# Get personalized feed
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/forums/feed?limit=10&offset=0
```

## Troubleshooting

### Issue: Embeddings not being generated

**Check:**

1. Forum is approved: `forum.validation_status = 'approved'`
2. Forum is verified: `forum.is_ai_verified = true`
3. DeepSeek API is running: Check `DEEPSEEK_API_URL`
4. Check server logs for async errors

### Issue: Interest vector is null

**Check:**

1. User has activities: `GET /api/interest-vectors/stats`
2. Activities have forum embeddings: Check `forums.embedding` column
3. Embedding generation has completed

### Issue: Personalized feed not working

**Check:**

1. User has an interest vector: `GET /api/interest-vectors/me`
2. Forums have embeddings: `SELECT COUNT(*) FROM forums WHERE embedding IS NOT NULL`
3. Try fallback ranking: Forums from followed subjects
