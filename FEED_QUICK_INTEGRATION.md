# Quick Integration Guide: Priority Feed System

## 5-Step Integration

### Step 1: Update Server.js Socket Setup

Add realtime feed handlers to your main server file:

```javascript
// At the top of server.js
import { initializeRealtimeFeedHandlers } from "./app/services/forum/realtime_feed_handlers.js";
import jwt from "jsonwebtoken";

// After creating your Socket.IO instance:
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Auth required"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: decoded.id };
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

// Initialize realtime feed
initializeRealtimeFeedHandlers(io);

// Store io on app for access in controllers
app.set("io", io);
```

### Step 2: Update Forum Controller (Forum Creation)

When a forum is created and approved, emit the event:

```javascript
import { emitFeedEvents } from "../services/forum/realtime_feed_handlers.js";

// In your forum create route:
router.post("/", async (req, res) => {
  const forum = await createForum(req.body);

  // NEW: Emit realtime event
  const io = req.app.get("io");
  if (forum.validation_status === "approved" && forum.is_ai_verified) {
    emitFeedEvents.forumPublished(io, forum);
  }

  res.json(forum);
});
```

### Step 3: Update Vote/Comment Routes

When engagement happens, track trending:

```javascript
import { emitFeedEvents } from "../services/forum/realtime_feed_handlers.js";

// In your vote route:
router.post("/:forumId/vote", async (req, res) => {
  const result = await recordVote(req.params.forumId, req.body.voteType);

  // NEW: Check if trending and emit
  const isTrending = result.upvotes > 50; // Adjust threshold
  const io = req.app.get("io");

  emitFeedEvents.engagementUpdated(io, req.params.forumId, {
    upvotes: result.upvotes,
    downvotes: result.downvotes,
    commentCount: result.comments_count,
    trending: isTrending,
  });

  res.json(result);
});
```

### Step 4: Update AI Verification Route

When forums are verified, notify users:

```javascript
import { emitFeedEvents } from "../services/forum/realtime_feed_handlers.js";

// In your verification route:
router.post("/:forumId/verify", async (req, res) => {
  const verification = await verifyForum(req.params.forumId);

  // NEW: Emit verification event
  const io = req.app.get("io");
  emitFeedEvents.forumVerified(io, req.params.forumId, {
    subject_id: verification.subject_id,
    is_valid: verification.is_valid,
    confidence: verification.confidence,
  });

  res.json(verification);
});
```

### Step 5: Add Hook to Feed Component

Use the realtime hook in your frontend feed component:

```jsx
// In your Feed page (e.g., pages/Feed.tsx)
import { useRealtimeFeed } from "@/hooks/useRealtimeFeed";

export default function Feed() {
  // Initialize realtime listener
  useRealtimeFeed();

  const { data: forums } = useQuery(
    ["personalizedFeed", offset],
    () => fetchPersonalizedFeed(offset),
    { staleTime: 30 * 1000 }, // 30 seconds
  );

  return (
    <div>
      {forums?.map((forum) => (
        <ForumCard key={forum.id} forum={forum} />
      ))}
    </div>
  );
}
```

## That's It! ✅

Your feed system now has:

- ✅ Priority-based ranking (vector → subjects → following → trending)
- ✅ 30-minute vector expiration with automatic cleanup
- ✅ Realtime updates via WebSockets
- ✅ Automatic feed refresh on important events
- ✅ Subject/user subscription management

## Key Environment Variables

Ensure these are in your `.env`:

```
JWT_SECRET=your_secret_key
VITE_API_URL=http://localhost:5000
VITE_BACKEND_URL=http://localhost:5000
```

## Testing Quick Checks

1. **Vector Expiration:** Call `/feed` after 30+ minutes, check logs for "⏰ Vector EXPIRED"
2. **Fallback:** Clear vector from DB, feed should use subjects/followers tier
3. **Realtime:** Create forum, watch frontend for "🔄 New forum published" in console
4. **Engagement:** Upvote a forum, check for engagement event logging

## Troubleshooting

| Issue                 | Solution                                                                     |
| --------------------- | ---------------------------------------------------------------------------- |
| Socket not connected  | Check JWT_SECRET matches between auth & socket middleware                    |
| Feed not updating     | Verify socket server is initialized with `initializeRealtimeFeedHandlers`    |
| Old vector being used | Check `user_interest_vectors` table has correct timestamps                   |
| Feed appears empty    | Confirm forums have `validation_status='approved'` AND `is_ai_verified=true` |

## File Locations

- Backend: `/backend/app/services/forum/feed_controller.js` (updated)
- Backend: `/backend/app/services/forum/realtime_feed_service.js` (new)
- Backend: `/backend/app/services/forum/realtime_feed_handlers.js` (new)
- Frontend: `/frontend/src/hooks/useRealtimeFeed.js` (new)
- Docs: `/PRIORITY_FEED_IMPLEMENTATION.md` (detailed guide)

## Next Steps

1. Implement the 5 steps above
2. Test with the checklist in detailed docs
3. Monitor logs for proper event flow
4. Adjust priority weights based on engagement metrics
5. Consider Redis caching for high-traffic scenarios
