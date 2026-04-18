# Quick Start: Forum Embeddings + Personalized Feed

## 📋 Prerequisites

- Backend running (Node.js, Express)
- Supabase configured
- DeepSeek API access (or Gemini for embeddings)

## 🚀 Getting Started

### 1. Database Setup

Apply the migration to your Supabase database:

**Via Supabase Dashboard:**

1. Go to SQL Editor
2. Copy contents of `backend/migrations/20260418_forum_embeddings_and_interest_vectors.sql`
3. Paste and execute

**Via CLI (if available):**

```bash
psql -U supabase_user -d your_db < backend/migrations/20260418_forum_embeddings_and_interest_vectors.sql
```

### 2. Environment Configuration

Update `.env`:

```bash
# For DeepSeek embeddings
DEEPSEEK_API_URL=http://localhost:8000/ai

# Or use Gemini (already configured)
GEMINI_API_KEY=your_key_here
```

### 3. Start Backend

```bash
cd backend
npm install  # If needed
npm run dev
```

### 4. Verify Setup

```bash
# Test API is responding
curl http://localhost:3000/

# Create a test forum (requires auth token)
curl -X POST http://localhost:3000/api/forums \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Test forum","subject":"General"}'
```

## 🎯 Testing the Features

### Test 1: Forum Embedding

```bash
# 1. Create a forum (requires auth)
# After it's approved (wait ~5-10s), check if embedding was generated:

curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/forums/FORUM_ID

# Look for "embedding" field in response (may need to query database)
```

### Test 2: Activity Tracking

```bash
# 1. Upvote a forum
curl -X POST http://localhost:3000/api/forums/FORUM_ID/vote \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"voteType": 1}'

# 2. Check activity was logged
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/interest-vectors/stats
```

### Test 3: Interest Vector Computation

```bash
# Get or compute interest vector
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/interest-vectors/me

# Force recompute
curl -X POST -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/interest-vectors/me/recompute

# Check activity stats
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/interest-vectors/stats
```

### Test 4: Personalized Feed

```bash
# Get personalized feed (uses interest vector)
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/forums/feed?limit=10&offset=0"
```

## 🔧 Backend Batch Embedding (Optional)

Generate embeddings for all existing forums:

```bash
# Run batch processing
cd backend
node app/services/jobs/embedding_generation_job.js

# Or use the init script
node scripts/init_embeddings.js --batch-embed
```

## 📊 Monitoring

### Check Embedding Status

```sql
-- In Supabase SQL Editor
SELECT
  id,
  title,
  embedding IS NOT NULL as has_embedding,
  created_at
FROM forums
WHERE validation_status = 'approved'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Interest Vectors

```sql
SELECT
  user_id,
  updated_at,
  (interest_vector IS NOT NULL) as has_vector
FROM user_interest_vectors
ORDER BY updated_at DESC
LIMIT 10;
```

### Check User Activities

```sql
SELECT
  action_type,
  COUNT(*) as count
FROM user_activity
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY action_type;
```

## 🐛 Troubleshooting

### Embeddings not generating

```javascript
// Check server logs for:
// "Generating embedding for forum..."
// "Embedding saved for forum..."

// If missing, check:
// 1. Forum is approved: validation_status = 'approved'
// 2. Forum is verified: is_ai_verified = true
// 3. DeepSeek API URL is correct in .env
// 4. Server has internet access
```

### Interest vector is null

```javascript
// Check if user has activities:
GET / api / interest - vectors / stats;

// Should show activity_count > 0
// If 0, user needs to interact with forums first
```

### Feed not personalizing

```javascript
// Debug steps:
// 1. Get user's interest vector
GET /api/interest-vectors/me

// 2. Check if forums have embeddings
SELECT COUNT(*) FROM forums WHERE embedding IS NOT NULL;

// 3. Check if vector is recent (< 30 min old)
SELECT NOW() - updated_at FROM user_interest_vectors WHERE user_id = 'USER_ID';
```

## 📈 Performance Tips

1. **Batch Embeddings During Off-Peak**
   - Run batch processing at night
   - Set delay to 1000ms between batches

2. **Clear Old Activities**

   ```javascript
   // In user_activity_model.js
   await UserActivityModel.clearOldActivities(30); // Keep 30 days
   ```

3. **Monitor Vector Age**
   ```sql
   -- Check how many vectors need refresh
   SELECT COUNT(*) FROM user_interest_vectors
   WHERE NOW() - updated_at > INTERVAL '30 minutes';
   ```

## 🔄 Cron Job Setup (Optional)

### Using node-cron:

```bash
npm install node-cron
```

```javascript
// In server.js or separate job file
import cron from "node-cron";
import { embeddingGenerationJobScheduled } from "./app/services/jobs/embedding_generation_job.js";

// Run daily at 2:00 AM
cron.schedule("0 2 * * *", embeddingGenerationJobScheduled);
```

### Using system cron:

```bash
# Edit crontab
crontab -e

# Add: Run embedding job daily at 2 AM
0 2 * * * cd /path/to/backend && node scripts/init_embeddings.js --batch-embed > logs/embedding.log 2>&1
```

## 📚 Full Documentation

See `AI_FEATURES_FORUM_EMBEDDINGS.md` for:

- Complete architecture overview
- API reference
- Database schema details
- Vector operations
- Scaling strategies
- Advanced troubleshooting

## ✅ Checklist

- [ ] Database migration applied
- [ ] .env configured with API keys
- [ ] Backend server running
- [ ] Test forum created and approved
- [ ] Embedding generated (check logs)
- [ ] Activity tracking working
- [ ] Interest vector computed
- [ ] Feed API returning personalized results

## 🎉 You're Done!

Your forum embedding and personalized feed system is now active and learning from user behavior!
