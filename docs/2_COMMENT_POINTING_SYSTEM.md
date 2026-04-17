# 2. Comment Pointing System & Logic Flow

## Overview

Academiq implements a **two-tier comment quality validation system** that scores comments (0-10 points) based on academic relevance, clarity, and originality. Points are awarded based on AI evaluation and determine user reputation/achievements.

---

## System Architecture

```
User Posts Comment
    ↓
✅ Save to Database (points_awarded = NULL initially)
    ↓
🔄 TIER 1: Immediate Point Validation (Fire & Forget)
    ├─ Call AI to score comment (0-10)
    ├─ If points = 0 → DELETE comment, notify user
    ├─ If points > 0 → Save points, update user points
    └─ Mark: points_processed_at = NOW()
    ↓
🔗 TIER 2: Source Validation (Post-Points, if points > 0)
    ├─ Extract URLs from comment
    ├─ Validate each URL
    ├─ Reduce points by 30% if sources invalid
    └─ Mark: verification_checked_at = NOW()
    ↓
✨ Trigger Achievements & Real-time Events
```

---

## Data Model

### Comments Table Schema

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY,
  forum_id UUID REFERENCES forums(id),
  user_id UUID REFERENCES users(id),
  parent_comment_id UUID REFERENCES comments(id),  -- NULL for top-level

  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Voting & Engagement
  upvotes_count INT DEFAULT 0,
  downvotes_count INT DEFAULT 0,

  -- Points System (AI Evaluation)
  points_awarded INT DEFAULT NULL,              -- NULL = not yet scored
  points_reason TEXT,                           -- Why this score?
  points_processed_at TIMESTAMP,                -- When scored

  -- Verification System
  is_ai_verified BOOLEAN DEFAULT FALSE,
  verification_source_url TEXT,                 -- Credible source found
  verification_checked_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_comments_forum_id ON comments(forum_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_points_awarded ON comments(points_awarded);
CREATE INDEX idx_comments_points_processed_at ON comments(points_processed_at);
```

---

## Tier 1: Immediate Point Validation

### Trigger & Entry Point

**File:** `comment_controller.js:createComment()`

```javascript
// POST /api/forums/:id/comments
async createComment(req, res) {
  const userId = req.user?.id;
  const forumId = req.params.id;
  const { content, parent_comment_id = null } = req.body;

  // 1. Save comment to database (points_awarded = NULL)
  const { data: created } = await CommentModel.create({
    forum_id: forumId,
    user_id: userId,
    content: content.trim(),
    parent_comment_id
  });

  // 2. TIER 1: Trigger async point validation - FIRE AND FORGET
  if (forum) {
    CommentModerationService.validatePointsImmediately(
      created.id,                      // commentId
      userId,                          // userId
      forumId,                         // forumId
      forum.title,                     // forumTitle
      forum.content,                   // forumContent
      content                          // commentContent
    ).catch(err => {
      console.error("Tier 1 validation error:", err);
    });
  }

  // 3. Return 201 immediately (comment is "pending" validation)
  res.status(201).json({ comment: created });
}
```

**Key Points:**

- ✅ Returns 201 immediately (non-blocking)
- ✅ Comment visible to users even before scoring
- ✅ Validation happens in background
- ❌ If points = 0, comment deleted after scoring

---

### Validation Algorithm

**File:** `commentModerationService.js:validatePointsImmediately()`

#### Step 1: Fetch Context

```javascript
async validatePointsImmediately(
  commentId,
  userId,
  forumId,
  forumTitle,
  forumContent,
  commentContent
) {
  console.log(`⏱️  [TIER 1] Validating points immediately: ${commentId}`);

  // Fetch existing comments for context (last 10)
  const { data: existingComments } = await supabase
    .from("comments")
    .select("content")
    .eq("forum_id", forumId)
    .neq("id", commentId)
    .order("created_at", { ascending: false })
    .limit(10);

  const existingCommentTexts = existingComments
    ? existingComments.map(c => c.content)
    : [];
```

**Context includes:**

- Forum title
- Forum content
- Last 10 comments (to detect duplicates/repetition)

---

#### Step 2: Call AI Service

```javascript
const validationResult = await AIService.validatePoints(
  commentId,
  forumTitle,
  forumContent,
  commentContent,
  existingCommentTexts,
  null, // optional thread summary
);

const { awarded_points: pointsScore, reason } = validationResult;
const pointsAwarded = Math.max(0, Math.min(10, parseInt(pointsScore) || 0));

console.log(`📊 Points validation: ${pointsAwarded}/10 | Reason: ${reason}`);
```

**AI Validation Criteria:**

1. **Academic Relevance** - Does it address the forum topic?
2. **Clarity** - Is it well-written and understandable?
3. **Originality** - Is it duplicate or adds new insight?
4. **Correctness** - Is information accurate?

**Score Mapping:**

- 0 points: Off-topic, spam, or completely incorrect
- 1-3 points: Partially relevant or lacks clarity
- 4-6 points: Good, relevant contribution
- 7-9 points: Excellent insight or well-explained
- 10 points: Outstanding contribution

---

#### Step 3: Handle Zero Points (Delete Comment)

```javascript
if (pointsAwarded === 0) {
  console.log(`❌ Zero points detected. Deleting comment ${commentId}...`);

  // Delete the comment
  const { error: deleteError } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (deleteError) {
    console.error(`Failed to delete low-quality comment:`, deleteError);
    throw deleteError;
  }

  // Notify user why their comment was deleted
  await NotificationService.createNotification({
    userId,
    type: "comment_rejected",
    referenceId: commentId,
    message: `Your comment was automatically removed for not meeting quality standards. Reason: ${reason}`,
    metadata: {
      reason,
      commentPreview: commentContent.substring(0, 100),
    },
  });

  return {
    approved: false,
    reason: "zero_points",
    pointsAwarded: 0,
  };
}
```

**Deletion Logic:**

- Comments = 0 are immediately removed
- User notified via notification
- No archive/recovery option

---

#### Step 4: Save Points (If > 0)

```javascript
console.log(`✅ Comment approved with ${pointsAwarded} points`);

// Update comment with points
const { error: updateError } = await supabase
  .from("comments")
  .update({
    points_awarded: pointsAwarded,
    points_reason: reason,
    points_processed_at: new Date().toISOString(),
  })
  .eq("id", commentId);

// Update user's total points
const user = await UserModel.findById(userId);
if (user) {
  const newUserPoints = (user.points || 0) + pointsAwarded;

  const { error: userUpdateErr } = await supabase
    .from("users")
    .update({ points: newUserPoints })
    .eq("id", userId);

  if (!userUpdateErr) {
    console.log(`✅ User ${userId} points: ${user.points} → ${newUserPoints}`);
  }
}

return {
  approved: true,
  reason: "points_validated",
  pointsAwarded,
};
```

**Point Award Formula:**

$$\text{User Points} = \text{Previous Points} + \text{Comment Points}$$

---

## Tier 2: Source Validation (Post-Points)

### When It Triggers

**File:** `comment_controller.js:createComment()`

```javascript
// After TIER 1 completes (if points > 0)
if (forum) {
  const regradingResult = ... // from comment update

  if (regradingResult.pointsAwarded > 0) {
    // TIER 2: Validate sources
    CommentModerationService.validateSourcesAfterPoints(
      created.id,                       // commentId
      regradingResult.pointsAwarded,    // points from TIER 1
      content                           // commentContent
    ).catch(err => {
      console.error("Tier 2 validation error:", err);
    });
  }
}
```

---

### Implementation

**File:** `commentModerationService.js:validateSourcesAfterPoints()`

#### Step 1: Extract URLs

```javascript
async validateSourcesAfterPoints(commentId, pointsAwarded, commentContent) {
  console.log(
    `🔗 [TIER 2] Validating sources: ${commentId} (${pointsAwarded} pts)`
  );

  // Regex to find URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = commentContent.match(urlRegex) || [];

  if (urls.length === 0) {
    console.log(`ℹ️  No URLs found in comment`);
    return { sourceValid: true, adjustment: 0 };
  }

  console.log(`🔍 Found ${urls.length} URL(s) to validate`);
```

#### Step 2: Validate Each URL

```javascript
let pointAdjustment = 0;
let flaggedUrls = [];

for (const url of urls) {
  try {
    const response = await axios.head(url, {
      timeout: 5000,
      redirect: true,
    });

    // Check if URL is accessible (200-299, 301-308)
    if (response.status >= 200 && response.status < 400) {
      console.log(`✅ URL valid: ${url}`);
    } else {
      console.log(`⚠️  URL unreachable (${response.status}): ${url}`);
      pointAdjustment -= Math.ceil(pointsAwarded * 0.15); // 15% per invalid
      flaggedUrls.push(url);
    }
  } catch (err) {
    console.log(`❌ URL validation failed: ${url}`);
    pointAdjustment -= Math.ceil(pointsAwarded * 0.15);
    flaggedUrls.push(url);
  }
}
```

**Validation Checks:**

- ✅ URL is accessible (HTTP 200-299)
- ✅ URL redirects are valid (301-308)
- ❌ 404, 403, 5xx → Invalid
- ❌ Timeout (5s) → Invalid

#### Step 3: Apply Point Adjustment

```javascript
if (pointAdjustment < 0) {
  const newPoints = Math.max(0, pointsAwarded + pointAdjustment);

  console.log(`📉 Adjusting points: ${pointsAwarded} → ${newPoints}`);

  // Update comment points
  const { error: updateError } = await supabase
    .from("comments")
    .update({
      points_awarded: newPoints,
      points_reason: `Original: ${pointsAwarded} pts. Reduced by ${Math.abs(pointAdjustment)} due to invalid sources.`,
    })
    .eq("id", commentId);

  // Update user points (difference)
  const pointsDifference = newPoints - pointsAwarded;
  const user = await UserModel.findById(userId);
  const newUserPoints = Math.max(0, (user.points || 0) + pointsDifference);

  await supabase
    .from("users")
    .update({ points: newUserPoints })
    .eq("id", userId);

  // Notify user
  await NotificationService.createNotification({
    userId,
    type: "comment_points_adjusted",
    referenceId: commentId,
    message: `Your comment points were reduced due to invalid sources: ${newPoints}/${pointsAwarded} points.`,
    metadata: {
      originalPoints: pointsAwarded,
      newPoints,
      flaggedUrls,
      reason: "Invalid source URLs",
    },
  });

  return { sourceValid: false, adjustment: pointAdjustment };
}
```

**Adjustment Formula:**

- Base reduction: 15% per invalid URL
- Minimum adjustment: 1 point
- Result clamped to [0, max]

---

## Updating Comments (Re-grading)

### When Update Triggers Re-validation

**File:** `comment_controller.js:updateComment()`

```javascript
async updateComment(req, res) {
  const userId = req.user?.id;
  const { id } = req.params;
  const { content } = req.body;

  // 1. Fetch original comment
  const { data: originalComment } = await CommentModel.findById(id);

  // Check authorization
  if (originalComment.user_id !== userId) {
    return res.status(403).json({ error: "Not authorized" });
  }

  // 2. RE-VALIDATE edited content
  let regradingResult;
  try {
    const { data: forum } = await ForumModel.findById(
      originalComment.forum_id
    );

    regradingResult = await CommentModerationService.validatePointsImmediately(
      id,
      userId,
      originalComment.forum_id,
      forum.title,
      forum.content,
      content  // NEW content
    );
  } catch (err) {
    console.error("Regrading failed:", err);
    return res.status(500).json({ error: "Regrading failed" });
  }

  // 3. If rejected (0 points), don't allow update
  if (!regradingResult.approved) {
    return res.status(422).json({
      error: "Cannot update comment - quality check failed",
      reason: regradingResult.reason
    });
  }
```

---

### Points Recalculation

```javascript
// 4. CRITICAL: SUBTRACT OLD POINTS, THEN ADD NEW
const oldPointsAwarded = originalComment.points_awarded || 0;
const newPointsAwarded = regradingResult.pointsAwarded || 0;
const pointsDifference = newPointsAwarded - oldPointsAwarded;

console.log(`💰 Point calculation for comment ${id}:`);
console.log(
  `   Old: ${oldPointsAwarded}, New: ${newPointsAwarded}, Difference: ${pointsDifference}`,
);

// Update database
const { data: user } = await UserModel.findById(userId);
let userCurrentPoints = user?.points || 0;

// ALWAYS: subtract old, then add new (prevents double-counting issues)
let calculatedPoints = Math.max(
  0,
  userCurrentPoints - oldPointsAwarded + newPointsAwarded,
);

console.log(
  `   User points: ${userCurrentPoints} - ${oldPointsAwarded} + ${newPointsAwarded} = ${calculatedPoints}`,
);

// Update comment
await supabase
  .from("comments")
  .update({
    content: content.trim(),
    points_awarded: newPointsAwarded,
    updated_at: new Date().toISOString(),
  })
  .eq("id", id);

// Update user points
await supabase
  .from("users")
  .update({ points: calculatedPoints })
  .eq("id", userId);

// Notify user if points changed
if (pointsDifference !== 0) {
  await NotificationService.createNotification({
    userId,
    type: "comment_regraded",
    referenceId: id,
    message: `Your comment was re-evaluated. Points: ${oldPointsAwarded} → ${newPointsAwarded} (${pointsDifference > 0 ? "+" : ""}${pointsDifference})`,
    metadata: {
      oldPoints: oldPointsAwarded,
      newPoints: newPointsAwarded,
      difference: pointsDifference,
      reason: regradingResult.reason,
    },
  });
}
```

**Key Pattern:**
$$\text{New User Points} = \text{Old User Points} - \text{Old Comment Points} + \text{New Comment Points}$$

This prevents:

- ✅ Double-counting when points increase
- ✅ Negative points from penalty reduction
- ✅ Inconsistencies with multiple updates

---

## Real-Time Events

### Socket.IO Emission

After point validation completes:

```javascript
// Emit real-time event
const io = getIO();
io.to(`post:${forumId}`).emit("comment_created", {
  comment: {
    ...comment,
    points_awarded: pointsAwarded,
    points_reason: reason,
  },
  metadata: {
    verified: isVerified,
    tier1Score: pointsAwarded,
    tier2Adjustment: adjustment,
  },
});
```

**Events:**

- `comment_created` - Initial creation (points pending)
- `comment_updated` - Points awarded (TIER 1)
- `comment_verified` - Source verified & points adjusted (TIER 2)
- `comment_deleted` - Zero points deletion

---

## Achievement Triggers

After each validation:

```javascript
// Trigger achievement evaluation
AchievementService.triggerOnCommentCreated(userId);
AchievementService.triggerOnVerificationConfirmed(userId); // if verified
```

---

## Logging & Monitoring

### Console Output Example

```
⏱️  [TIER 1] Validating points immediately: 550e8400-e29b-41d4-a716-446655440000
📊 Fetch context: Found 8 existing comments
📊 Points validation: 7/10 | Reason: Clear explanation with accurate calculus principles
✅ Comment approved with 7 points
💾 Updated comment points_awarded = 7
✅ User 123e4567-e89b-12d3-a456-426614174000 points: 42 → 49

🔗 [TIER 2] Validating sources: 550e8400-e29b-41d4-a716-446655440000 (7 pts)
🔍 Found 2 URL(s) to validate
✅ URL valid: https://en.wikipedia.org/wiki/Integral
❌ URL unreachable (404): https://example.com/dead-link
📉 Adjusting points: 7 → 6 (reduced by 1)
✅ User notified of adjustment
```

---

## Workflow Summary Table

| Phase      | Trigger        | Action                    | Outcome                   | User Blocking   |
| ---------- | -------------- | ------------------------- | ------------------------- | --------------- |
| **Create** | POST comment   | Save to DB (points=NULL)  | 201 response              | No              |
| **TIER 1** | Stored comment | Score via AI              | Points awarded or deleted | No              |
| **TIER 2** | Points > 0     | Validate URLs             | Points adjusted           | No              |
| **Update** | PUT comment    | Re-grade with new content | Points recalculated       | Yes if rejected |
| **Notify** | Any change     | Send notification         | User aware of status      | No              |

---

## Implementation Checklist

- ✅ Comments table with points columns
- ✅ AI validation endpoint
- ✅ CommentModerationService (TIER 1 & 2)
- ✅ Fire-and-forget async validation
- ✅ URL validation with timeout
- ✅ Point recalculation on update
- ✅ Notification system
- ✅ Socket.IO real-time events
- ✅ Achievement triggers
- ⚠️ Batch re-grading for historical comments
- ⚠️ Appeals process for deleted comments

---

## Related Systems

- **AI Service:** `aiService.js`, FastAPI validation endpoints
- **Notifications:** `notification_service.js`
- **Achievements:** `achievement_service.js`
- **Post Validation:** See doc #3
