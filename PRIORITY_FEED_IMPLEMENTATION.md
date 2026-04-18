# Priority-Based Feed Implementation with Realtime Updates

## Overview

This implementation modernizes the Academiq feed system with a **hierarchical priority model** and **realtime WebSocket updates**. The feed now intelligently ranks content based on:

1. **User Interest Vector** (AI-based personalization, < 30 min old)
2. **Followed Subjects** (User's academic interests)
3. **Following Users' Forums** (Content from peers they follow)
4. **Trending/Engagement** (Community-wide trending content)

## Architecture

### Backend Components

#### 1. **feed_controller.js** (Updated)

- Implements the priority-based ranking algorithm
- Manages vector expiration (30-minute TTL)
- Provides fallback hierarchy when vector is expired/missing
- Supports pagination and enrichment

**Key Features:**

- Vector validity checking with automatic expiration
- Clear logging showing which priority tier is active
- Hierarchical fallback with proper categorization
- Secondary ranking for vector results

**Code Location:** `backend/app/services/forum/feed_controller.js`

#### 2. **realtime_feed_service.js** (New)

- Manages WebSocket events for realtime feed updates
- Handles room subscriptions (subjects, user followers)
- Emits events when forums are published, verified, or trending

**Key Methods:**

- `initializeRealtimeFeed(socketServer)` - Setup socket listeners
- `emitNewForumPublished(socketServer, forumData)` - Broadcast new forums
- `emitForumVerified(socketServer, forumId, verificationData)` - Notify of verification
- `emitForumEngagementUpdated(socketServer, forumId, engagementData)` - Track trending
- `notifyVectorUpdated(socketServer, userId)` - Trigger feed refresh on vector update
- `subscribeToSubject(socket, subjectId)` - Subscribe to subject room
- `subscribeToUser(socket, userId)` - Subscribe to user followers room

**Code Location:** `backend/app/services/forum/realtime_feed_service.js`

#### 3. **realtime_feed_handlers.js** (New)

- Registers socket event handlers
- Manages client subscriptions/unsubscriptions
- Provides `emitFeedEvents` object for use by other controllers

**Usage in Other Controllers:**

```javascript
import { emitFeedEvents } from "../services/forum/realtime_feed_handlers.js";

// When forum is published
emitFeedEvents.forumPublished(socketServer, forumData);

// When forum gets engagement
emitFeedEvents.engagementUpdated(socketServer, forumId, {
  upvotes: 15,
  downvotes: 2,
  commentCount: 8,
  trending: true, // boolean if forum is trending
});

// When forum is AI verified
emitFeedEvents.forumVerified(socketServer, forumId, {
  subject_id: subjectId,
  is_valid: true,
  confidence: 0.95,
});

// When user's vector is updated
emitFeedEvents.vectorUpdated(socketServer, userId);

// Proactive trending notification
emitFeedEvents.trendingContent(
  socketServer,
  userId,
  forumId,
  "high_engagement",
);
```

### Frontend Components

#### 1. **useRealtimeFeed.js** (New Hook)

- Subscribes to realtime feed events
- Triggers React Query invalidation for feed updates
- Provides APIs for subject/user subscriptions

**Usage:**

```jsx
import { useRealtimeFeed } from "@/hooks/useRealtimeFeed";

function FeedPage() {
  const { subscribeToSubject, unsubscribeFromSubject } = useRealtimeFeed();

  // Subscribe to Chemistry subject
  useEffect(() => {
    subscribeToSubject("subject-123");
    return () => unsubscribeFromSubject("subject-123");
  }, []);

  return <Feed />;
}
```

**Features:**

- Automatic socket initialization from localStorage token
- Query invalidation on feed events
- Complete cache clear on vector updates
- Subject and user subscription management

**Code Location:** `frontend/src/hooks/useRealtimeFeed.js`

## Integration Steps

### 1. Backend Server Setup (server.js)

Add socket event initialization to your Express/Socket.IO setup:

```javascript
import { initializeRealtimeFeedHandlers } from "./app/services/forum/realtime_feed_handlers.js";
import { authMiddleware } from "./app/middlewares/auth_middleware.js";

const io = require("socket.io")(server, {
  cors: { origin: "*", credentials: true },
});

// Apply auth middleware to socket
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Auth token required"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: decoded.id };
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

// Initialize realtime feed handlers
initializeRealtimeFeedHandlers(io);

server.listen(PORT, () => {
  console.log(`✅ Server running with realtime feed support`);
});
```

### 2. Forum Controller Integration

In your forum creation/verification handlers, emit events:

```javascript
import { emitFeedEvents } from "../services/forum/realtime_feed_handlers.js";

// When forum is created and approved
router.post("/forums", async (req, res) => {
  const forum = await createForum(req.body);

  // Emit realtime event
  emitFeedEvents.forumPublished(req.app.get("io"), forum);

  res.json(forum);
});

// When forum is AI verified
router.post("/forums/:id/verify", async (req, res) => {
  const verification = await verifyForum(req.params.id);

  // Emit verification event
  emitFeedEvents.forumVerified(req.app.get("io"), req.params.id, verification);

  res.json(verification);
});

// When vote/comment changes forum engagement
router.post("/forums/:id/vote", async (req, res) => {
  const engagement = await recordVote(req.params.id, req.body);

  // Check if trending and emit
  const isTrending = engagement.upvotes > TRENDING_THRESHOLD;
  emitFeedEvents.engagementUpdated(req.app.get("io"), req.params.id, {
    upvotes: engagement.upvotes,
    downvotes: engagement.downvotes,
    commentCount: engagement.comments_count,
    trending: isTrending,
  });

  res.json(engagement);
});
```

### 3. Frontend Integration

Add the hook to your feed page component:

```jsx
import { useRealtimeFeed } from "@/hooks/useRealtimeFeed";

function FeedPage() {
  const { subscribeToSubject, unsubscribeFromSubject } = useRealtimeFeed();
  const { data: forums } = useQuery(["personalizedFeed"], fetchFeed);

  // Subscribe to user's followed subjects
  useEffect(() => {
    userFollowedSubjects.forEach((subjectId) => {
      subscribeToSubject(subjectId);
    });
  }, [userFollowedSubjects]);

  return (
    <div>
      {forums.map((forum) => (
        <ForumCard key={forum.id} forum={forum} />
      ))}
    </div>
  );
}
```

## Feed Priority Logic

### Priority Tier 1: User Interest Vector

- **Condition:** Vector exists AND is < 30 minutes old AND has results
- **Algorithm:** Semantic similarity search via `get_semantic_suggestions` RPC
- **Response:** Forums ranked by similarity_score
- **Logging:** "✅ PRIORITY 1: Using valid interest vector"

### Priority Tier 2: Followed Subjects

- **Condition:** No valid vector OR vector returned 0 results
- **Algorithm:** Filters forums by `subject_id` in user's followed subjects
- **Sorting:** By engagement_score, then recency
- **Logging:** "📚 Followed subjects: X"

### Priority Tier 3: Following Users' Forums

- **Condition:** After Priority 2 forums
- **Algorithm:** Filters forums by `user_id` in followed users
- **Sorting:** By engagement_score, then recency
- **Logging:** "👥 Following users: Y forums"

### Priority Tier 4: Trending

- **Condition:** After Priority 3 forums
- **Algorithm:** All remaining approved forums
- **Sorting:** By engagement_score, then recency
- **Logging:** "🔥 Trending: Z forums"

### Vector Validity

- **Expiration:** 30 minutes from `user_interest_vectors.updated_at`
- **Automatic Cleanup:** When expired, vector is cleared from DB
- **Recomputation:** Manual refresh happens on demand if cleared

### Fallback Hierarchy Visualization

```
┌─────────────────────────────────────┐
│   1. Valid Interest Vector?         │
│   (Age < 30 min & has embedding)    │
├─────────────────────────────────────┤
│ YES →  Semantic Search + Secondary  │
│        Ranking (subject/user boost)  │
│                                     │
│ NO ↓                                │
├─────────────────────────────────────┤
│   2. Followed Subjects              │
│   (Sorted by engagement + recency)  │
├─────────────────────────────────────┤
│   3. Following Users' Forums        │
│   (Sorted by engagement + recency)  │
├─────────────────────────────────────┤
│   4. Trending/Community             │
│   (All other approved forums)       │
└─────────────────────────────────────┘
```

## Realtime Event Flow

### New Forum Published

```
Forum Controller → emitFeedEvents.forumPublished()
  ↓
RealtimeFeedService.emitNewForumPublished()
  ↓
Emit to all connected users:
  - "feed:forumPublished"
  - "feed:subjectForumPublished" (to subject room)
  - "feed:authorForumPublished" (to author's followers)
  ↓
Frontend Hook receives event
  ↓
queryClient.invalidateQueries(["personalizedFeed"])
  ↓
Feed component refetches with new content
```

### Forum Verification Event

```
Verification Controller → emitFeedEvents.forumVerified()
  ↓
RealtimeFeedService.emitForumVerified()
  ↓
Emit to all connected users:
  - "feed:forumVerified" with confidence level
  ↓
Frontend Hook receives
  ↓
queryClient.invalidateQueries(["personalizedFeed"])
  ↓
Feed refreshes with newly verified forum
```

### Engagement/Trending Event

```
Vote/Comment Controller → emitFeedEvents.engagementUpdated()
  ↓
RealtimeFeedService.emitForumEngagementUpdated()
  ↓
If trending=true:
  Emit "feed:engagementUpdated" to all users
  ↓
Frontend Hook receives
  ↓
queryClient.invalidateQueries(["personalizedFeed"])
  ↓
Feed re-ranks with trending forum elevated
```

### Vector Update Event

```
UserInterestService.computeVector() → emitFeedEvents.vectorUpdated()
  ↓
RealtimeFeedService.notifyVectorUpdated()
  ↓
Emit "feed:vectorUpdated" to specific user room
  ↓
Frontend Hook receives
  ↓
queryClient.removeQueries(["personalizedFeed"])
  ↓
Complete cache clear forces fresh fetch with new vector
```

## Database Requirements

### Ensure Table: `user_interest_vectors`

```sql
CREATE TABLE user_interest_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  interest_vector vector(1536),  -- For embedding
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_user_vectors_updated
ON user_interest_vectors(user_id, updated_at);
```

### Ensure RPC: `get_semantic_suggestions`

This should already exist but verify it:

- Takes: `query_vector` (vector), `max_results` (int)
- Returns: Forums with similarity_score, sorted descending
- Filters: Only `validation_status = 'approved'` and `is_ai_verified = true`

## Logging & Debugging

### Feed Endpoint Logs

```
🚀 Feed Request: user=abc123, limit=10, offset=0
✅ PRIORITY 1: Using valid interest vector (age: 2.5 min)
✅ Got 45 semantically similar forums
✅ After approval + embedding filter: 42 forums
📄 Paginating: 10 of 42 (offset=0)
```

### Socket Connection Logs

```
🔌 Setting up realtime feed socket...
✅ User abc123 connected to realtime feed
👁️ User subscribed to subject: chem-101
🔌 Setting up realtime feed listeners
```

### Realtime Event Logs

```
📢 Broadcasting new forum published: forum-456 (Chemistry Bonding)
✅ PRIORITY 1: Using valid interest vector (age: 15.3 min)
🔄 New forum published - invalidating feed cache
```

## Performance Considerations

### Vector Expiration Benefits

- **Reduces stale results:** 30-minute window keeps relevance fresh
- **Triggers recomputation:** User interests naturally evolve
- **DB space:** Prevents accumulation of old vectors

### Hierarchical Fallback Benefits

- **Fast response:** Follows/subjects cached frequently
- **Graceful degradation:** No vector? Uses engagement ranking
- **Flexibility:** Can adjust priority tiers without code changes

### Realtime Update Optimization

- **Selective invalidation:** Only invalidates on significant events
- **Room-based routing:** Subjects/users reduce broadcast overhead
- **Pagination:** Large result sets don't hog memory

## Testing Checklist

- [ ] Vector expiration: Check `/feed` with old vector (> 30 min)
- [ ] Vector refresh: Verify feed changes after vector recompute
- [ ] Fallback: Test with no vector in DB
- [ ] Socket connection: Verify auth middleware working
- [ ] Subject subscription: Test subject room broadcasts
- [ ] Forum published event: Verify frontend receives event
- [ ] Cache invalidation: Confirm React Query refetches
- [ ] Pagination: Test offset & limit parameters
- [ ] Multiple priorities: Ensure correct tier selection

## Future Enhancements

1. **A/B Testing:** Compare vector vs. fallback engagement metrics
2. **Personalization Tuning:** Adjust priority weights based on user cohorts
3. **Trending Metrics:** Track trending threshold dynamically
4. **Vector Lifecycle:** Implement TTL-based cleanup jobs
5. **Analytics:** Track which priority tier serves each user
6. **Caching:** Redis layer for frequently accessed feeds
7. **Push Notifications:** Send to offline users when trending
