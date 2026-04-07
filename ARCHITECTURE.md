# Personalization System - Architecture Overview

## System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER ACTIVITIES                              │
│  (View, Vote, Comment, Save from UI)                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
         ┌───────────────────────────────┐
         │   Activity Logging (Async)    │
         │  - activity_service.js        │
         │  - Non-blocking               │
         └───────────────┬───────────────┘
                         │
        ┌────────────────┴────────────────┐
        ↓                                 ↓
   ┌──────────────┐           ┌─────────────────────┐
   │ Log Activity │           │ Extract Topics      │
   │   to DB      │           │ - Tags              │
   └──────────────┘           │ - Subject           │
                              │ - Title Keywords    │
                              └────────┬────────────┘
                                       │
                                       ↓
                    ┌──────────────────────────────┐
                    │ Update User Interests        │
                    │ - user_interests_model.js    │
                    │ - Activity-weighted scoring  │
                    └──────────────┬───────────────┘
                                   │
                                   ↓
                    ┌──────────────────────────────┐
                    │  USER INTERESTS TABLE        │
                    │  (Persisted in Database)     │
                    └──────────────┬───────────────┘
                                   │
        ┌──────────────────────────┼───────────────────────┐
        │                          │                       │
        ↓                          ↓                       ↓
   ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
   │  Feed Ranking   │  │ Mutual Followers │  │ Trending Forums │
   │  Calculation    │  │  Calculation     │  │   Calculation   │
   └────────┬────────┘  └────────┬─────────┘  └────────┬────────┘
            │                    │                    │
            ↓                    ↓                    ↓
   ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
   │ Personalized    │  │  "People You May │  │  Engagement     │
   │    Feed API     │  │   Know" Endpoint │  │  Scoring API    │
   └────────┬────────┘  └────────┬─────────┘  └────────┬────────┘
            │                    │                    │
            └────────────────────┼────────────────────┘
                                 │
                                 ↓
                          ┌──────────────┐
                          │   Frontend   │
                          │   Displays   │
                          └──────────────┘
```

## Database Schema

```
user_content_interests
├── id (UUID, PK)
├── user_id (FK → users)
├── content_topic (TEXT, e.g., "calculus")
├── interest_score (FLOAT, 0-1)
├── activity_count (INT)
├── inferred_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
   Indexes:
   ├── (user_id)
   └── (user_id, interest_score DESC)

user_mutual_connections
├── user_a_id (FK → users, part of PK)
├── user_b_id (FK → users, part of PK)
├── mutual_count (INT)
└── updated_at (TIMESTAMP)
   Constraint: user_a_id < user_b_id (ordering)
   Indexes:
   ├── (user_a_id, mutual_count DESC)
   └── (user_b_id, mutual_count DESC)
```

## API Data Flow

### Feed Endpoint

```
GET /api/forums/feed
  │
  ├─ Fetch user's followed subjects
  ├─ Fetch user's followed users
  ├─ Fetch user's top interests
  │
  ├─ Query forums (last 14 days, limit 200)
  │
  ├─ Calculate ranking score for each:
  │  ├─ Subject match (35%)
  │  ├─ Peer content (25%)
  │  ├─ Interest match (25%)
  │  ├─ Engagement score (10%)
  │  └─ Recency boost (5%)
  │
  ├─ Sort by descending score
  ├─ Apply pagination
  │
  └─ Return ranked forums + metadata
```

### Suggestions Endpoint

```
GET /api/forums/suggestions/people
  │
  ├─ Get people you follow
  │
  ├─ Get people they follow (excluding you & already-followed)
  │
  ├─ Count mutual followers for each suggestion
  │
  ├─ Sort by mutual count (DESC)
  ├─ Fallback to popular users if needed
  │
  └─ Return suggested users + mutual counts
```

## Activity Tracking Matrix

```
┌──────────────┬──────────┬────────────┬──────────────┐
│  Action      │ Weight   │ Signal     │ Location     │
├──────────────┼──────────┼────────────┼──────────────┤
│ View         │ 1        │ Low        │ getForumById  │
│ Comment      │ 3        │ Medium     │ createComment│
│ Upvote       │ 2        │ Medium     │ voteForum    │
│ Save         │ 4        │ High       │ toggleSave   │
│ Downvote     │ -1       │ Negative   │ voteForum    │
└──────────────┴──────────┴────────────┴──────────────┘

Each activity:
1. Logs to user_activity table (existing)
2. Extracts topics from forum
3. Updates user_interests scores
4. Next feed refresh includes updated interests
```

## Topic Extraction Algorithm

```
Forum Data: {
  title: "How to solve derivatives in calculus",
  tags: ["derivatives", "calculus"],
  subject: "Mathematics"
}

Extraction:
1. Tags → ["derivatives", "calculus"]
2. Subject → ["mathematics"]
3. Title keywords (>4 chars) → ["solve", "derivatives"]

Final Topics: {"derivatives", "calculus", "mathematics", "solve"}

For each topic:
  recordInterest(user_id, topic, weight)
    └─ Updates interest_score and activity_count
```

## Feed Scoring Formula

```
feedScore = (
  (subjectMatch && 0.35) +           // Followed this subject?
  (peerMatch && 0.25) +              // Followed this user?
  (interestMatch / topicsSize * 0.25) + // How many interests match?
  (min(engagement * 0.01, 0.10)) +   // Engagement score
  ((boost - 1.0) * 0.05)             // Recency decay (0-0.05)
)

Range: 0 to 1.0 (theoretical max if all signals present)

Sorting:
  Sort by feedScore (DESC)
  Post-sort by created_at (DESC) for tiebreaker
```

## Interest Scoring Logic

```
Activity → Weight
   │
   ├─ Create new interest
   │  └─ score = min(1.0, weight * 0.1)
   │  └─ count = 1
   │
   └─ Update existing interest
      └─ count = count + 1
      └─ score = min(1.0, old_score + weight * 0.1)
         (Capped at 1.0, gains diminish over time)
```

## Cold Start Handling

```
New user with no activities →
  Fetch followed subjects →
    Has subjects? → Use subject-based feed
    No subjects? → Use trending

User with no follows →
  Fetch followed users →
    Has follows? → Show their posts
    No follows? → Show popular
```

## Performance Considerations

```
✅ Async Activity Logging
   └─ Non-blocking, fire-and-forget

✅ Interest Updates
   └─ Incremental updates only
   └─ No full recalculation needed

✅ Feed Ranking
   └─ In-memory calculation
   └─ Fetches ~200 forums, ranks, paginates

✅ Database Indexes
   └─ All lookups use indexed columns
   └─ Mutual connections cached

⚠️  Future: Rate limiting for activity logging
⚠️  Future: Cache popular topics
⚠️  Future: Background interest decay jobs
```

## Error Handling

```
Activity Logging Fails
  └─ Caught, logged, doesn't crash request

Interest Extract Fails
  └─ Skips topic extraction, logs to DB normally

Feed Query Fails
  └─ Returns 500 error to client
  └─ Client can retry

Suggestions Query Fails
  └─ Falls back to popular users
  └─ Returns something rather than error
```

## Example User Journey

```
Day 1:
  User views forum on "Linear Algebra"
    → View activity logged
    → Topics: [linear algebra, matrices]
    → Interests recorded

Day 2:
  User upvotes forum on "Matrix Multiplication"
    → Upvote activity logged (weight: 2)
    → Topics: [matrix multiplication, algebra]
    → Interests updated (higher score)

Day 3:
  User comments on "Eigenvalues" forum
    → Comment activity logged (weight: 3)
    → Topics: [eigenvalues, matrix theory]
    → Interests updated

Day 4:
  User requests feed
    → Top interests: [matrix, algebra, linear]
    → Feed ranked with 25% weight for these topics
    → Relevant forums appear higher

  User requests suggestions
    → Mutual connections calculated
    → Shows users interested in same topics
```

## Monitoring & Analytics

Track these KPIs:

- Feed engagement rate (clicks, saves, votes)
- Interest accumulation rate
- Suggestion follow rate
- Activity logging success rate
- Feed ranking diversity
- User retention correlation with personalization

## Future Enhancements

1. **Phase 2: AI Content Similarity**
   - Embed forum content semantically
   - Vector similarity search
   - Better topic understanding

2. **Phase 3: Collaborative Filtering**
   - "Users who liked X also like Y"
   - Matrix factorization
   - User similarity

3. **Phase 4: Advanced Analytics**
   - A/B test ranking weights
   - Interest shelf-life optimization
   - Trending topic detection
