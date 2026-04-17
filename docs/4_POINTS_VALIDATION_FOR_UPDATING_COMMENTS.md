# 4. Points Validation for Updating Comments - Detailed Flow

## Overview

When a user **edits their comment**, Academiq implements a **re-grading system** that:

1. Fetches the original comment and its awarded points
2. Re-validates the edited content through AI
3. Compares old vs new points
4. Recalculates user's total points atomically
5. Handles edge cases (rejection, zero points, duplicate reduction)

This document focuses specifically on the update flow and point reconciliation.

---

## Architecture

```
User Edits Comment
    ↓
✅ Fetch Current Comment & Points
    ↓
✅ Authorization Check (Author Only)
    ↓
✅ Content Validation (Not Empty)
    ↓
🔄 RE-VALIDATE via AI (Get New Score)
    ↓
📊 COMPARE: Old Points vs New Points
    ├─ Calculate: difference = new - old
    └─ Update user points atomically
    ↓
🔗 TIER 2: Source Validation (If new > 0)
    ├─ Extract URLs from NEW content
    ├─ Apply adjustment
    └─ Update again if needed
    ↓
✨ Emit Real-time Events & Notifications
```

---

## Step-by-Step Implementation

### Step 1: Authorization & Fetch Original

**File:** `comment_controller.js:updateComment()`

```javascript
async updateComment(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const { content } = req.body;

    // Validation
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Content is required" });
    }

    // 1. FETCH THE ORIGINAL COMMENT
    const { data: originalComment, error: fetchErr } =
      await CommentModel.findById(id);

    if (fetchErr || !originalComment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // 2. CHECK AUTHORIZATION
    if (String(originalComment.user_id) !== String(userId)) {
      return res.status(403).json({
        error: "Not authorized to edit this comment"
      });
    }

    console.log(`📝 User ${userId} editing comment ${id}`);
    console.log(`   Original points: ${originalComment.points_awarded || 0}`);
    console.log(`   Original content length: ${originalComment.content.length}`);
```

---

### Step 2: Fetch Forum Context

```javascript
// 3. FETCH FORUM (needed for re-validation context)
const { data: forum, error: forumError } = await ForumModel.findByIdUnfiltered(
  originalComment.forum_id,
);

if (forumError || !forum) {
  return res.status(404).json({ error: "Associated forum not found" });
}

console.log(`🔍 Forum context: "${forum.title}"`);
```

---

### Step 3: RE-VALIDATE WITH AI

```javascript
// 4. RE-VALIDATE EDITED CONTENT
console.log(`🤖 Starting re-validation of edited comment...`);

let regradingResult;
try {
  // Get existing comments for context
  const { data: existingComments } = await supabase
    .from("comments")
    .select("content")
    .eq("forum_id", originalComment.forum_id)
    .neq("id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  const existingCommentTexts = existingComments
    ? existingComments.map((c) => c.content)
    : [];

  // Call AI validation
  const validationResult = await AIService.validatePoints(
    id,
    forum.title,
    forum.content,
    content.trim(), // NEW content to validate
    existingCommentTexts,
    null,
  );

  const { awarded_points: pointsScore, reason } = validationResult;
  const newPointsAwarded = Math.max(
    0,
    Math.min(10, parseInt(pointsScore) || 0),
  );

  regradingResult = {
    approved: newPointsAwarded > 0,
    pointsAwarded: newPointsAwarded,
    reason,
  };

  console.log(`✅ Re-validation complete: ${newPointsAwarded}/10 points`);
  console.log(`   Reason: ${reason}`);
} catch (err) {
  console.error(`❌ Re-validation failed:`, err);
  return res.status(500).json({
    error: "Failed to re-validate comment",
  });
}
```

---

### Step 4: Handle Zero Points Rejection

```javascript
// 5. IF NEW SCORE IS ZERO → REJECT THE EDIT
if (regradingResult.pointsAwarded === 0) {
  console.log(`❌ Re-valuation rejected (0 points). Edit not allowed.`);

  return res.status(422).json({
    error: "Cannot update comment - quality check failed",
    reason: regradingResult.reason,
    message: `Your edited comment doesn't meet quality standards. Original comment remains unchanged.`,
    metadata: {
      originalPoints: originalComment.points_awarded || 0,
      rejectionReason: regradingResult.reason,
      suggestion: "Please ensure your comment is relevant and well-written",
    },
  });
}

console.log(`✅ Edit approved. Proceeding with update...`);
```

---

### Step 5: Calculate Point Difference

```javascript
// 6. CALCULATE POINT DIFFERENCE
const oldPointsAwarded = originalComment.points_awarded || 0;
const newPointsAwarded = regradingResult.pointsAwarded;
const pointsDifference = newPointsAwarded - oldPointsAwarded;

console.log(`💰 Point calculation for comment ${id}:`);
console.log(`   Old: ${oldPointsAwarded} pts`);
console.log(`   New: ${newPointsAwarded} pts`);
console.log(
  `   Difference: ${pointsDifference > 0 ? "+" : ""}${pointsDifference} pts`,
);
```

**Formula:**
$$\Delta \text{Points} = \text{New Points} - \text{Old Points}$$

**Possible Values:**

- `Δ > 0`: User gains points (good edit)
- `Δ = 0`: Points unchanged (similar quality)
- `Δ < 0`: User loses points (lower quality)

---

### Step 6: Atomic Point Recalculation

```javascript
// 7. FETCH USER CURRENT POINTS (for atomic update)
const { data: user, error: userFetchErr } = await UserModel.findById(userId);

if (userFetchErr || !user) {
  return res.status(404).json({ error: "User not found" });
}

const userCurrentPoints = user.points || 0;

// CRITICAL: Always subtract old first, then add new
// This prevents double-counting on multiple edits
const calculatedPoints = Math.max(
  0, // Floor at zero
  userCurrentPoints - oldPointsAwarded + newPointsAwarded,
);

console.log(`📊 User point recalculation:`);
console.log(
  `   ${userCurrentPoints} - ${oldPointsAwarded} + ${newPointsAwarded} = ${calculatedPoints}`,
);

// Safety check
if (isNaN(calculatedPoints) || calculatedPoints < 0) {
  throw new Error("Invalid point calculation");
}
```

**Recalculation Algorithm:**

The key insight is to **always reverse the old points first**, then apply new points:

$$\text{User Points}_{\text{new}} = \max(0, \text{User Points}_{\text{old}} - \text{Old Comment Points} + \text{New Comment Points})$$

**Why This Pattern?**

1. **Prevents double-counting:** If old = 5 and new = 7:
   - ❌ Wrong: Points = Points + 7 = Points + 12 (should be +2)
   - ✅ Right: Points = Points - 5 + 7 = Points + 2

2. **Handles multiple edits:** On 3rd edit with 5→7→6:
   - Edit 1: 50 - 0 + 5 = 55
   - Edit 2: 55 - 5 + 7 = 57
   - Edit 3: 57 - 7 + 6 = 56

3. **Prevents negative points:** Max(0, ...) ensures no negative balances

---

### Step 7: Update Comment & User in Database

```javascript
// 8. UPDATE COMMENT (content + points + timestamp)
const { data: updatedComment, error: commentUpdateErr } = await supabase
  .from("comments")
  .update({
    content: content.trim(),
    points_awarded: newPointsAwarded,
    points_reason: regradingResult.reason,
    points_processed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  .eq("id", id)
  .select()
  .single();

if (commentUpdateErr) {
  console.error(`❌ Failed to update comment:`, commentUpdateErr);
  return res.status(500).json({ error: "Failed to update comment" });
}

console.log(`✅ Comment updated with new content & points`);

// 9. UPDATE USER POINTS (atomic transaction)
const { data: updatedUser, error: userUpdateErr } = await supabase
  .from("users")
  .update({ points: calculatedPoints })
  .eq("id", userId)
  .select()
  .single();

if (userUpdateErr) {
  console.error(`❌ Failed to update user points:`, userUpdateErr);
  return res.status(500).json({ error: "Failed to update user points" });
}

console.log(
  `✅ User ${userId} points updated: ${userCurrentPoints} → ${calculatedPoints}`,
);
```

---

### Step 8: Tier 2 Source Validation (If Points > 0)

```javascript
// 10. TIER 2: Validate sources in NEW content (if points > 0)
console.log(`🔗 Starting Tier 2 source validation...`);

if (newPointsAwarded > 0) {
  try {
    const sourceValidation =
      await CommentModerationService.validateSourcesAfterPoints(
        id,
        newPointsAwarded,
        content.trim(),
      );

    console.log(
      `🔗 Tier 2 result: adjustment = ${sourceValidation.adjustment}`,
    );

    // If sources were invalid and points were adjusted
    if (sourceValidation.adjustment < 0) {
      console.log(
        `📉 Applying source adjustment: ${sourceValidation.adjustment} pts`,
      );

      // Already handled by validateSourcesAfterPoints
      // (updates comment & user points internally)
    }
  } catch (tier2Err) {
    console.error(`⚠️  Tier 2 validation error (non-blocking):`, tier2Err);
    // Don't fail the request - Tier 2 is best-effort
  }
}
```

---

### Step 9: Emit Real-time Events

```javascript
// 11. EMIT REAL-TIME EVENTS
const io = getIO();
if (io) {
  io.to(`post:${originalComment.forum_id}`).emit("comment:updated", {
    commentId: id,
    oldPoints: oldPointsAwarded,
    newPoints: newPointsAwarded,
    pointsChanged: pointsDifference !== 0,
    content: updatedComment.content,
    updatedAt: updatedComment.updated_at,
    reason: regradingResult.reason,
  });

  console.log(`📡 Emitted comment:updated event`);
}
```

---

### Step 10: Create Notification

```javascript
// 12. CREATE NOTIFICATION IF POINTS CHANGED
if (pointsDifference !== 0) {
  try {
    const pointsDisplay =
      pointsDifference > 0 ? `+${pointsDifference}` : `${pointsDifference}`;

    await NotificationService.createNotification({
      userId,
      type: "comment_regraded",
      referenceId: id,
      message: `Your comment was re-evaluated. Points: ${oldPointsAwarded} → ${newPointsAwarded} (${pointsDisplay})`,
      metadata: {
        oldPoints: oldPointsAwarded,
        newPoints: newPointsAwarded,
        difference: pointsDifference,
        reason: regradingResult.reason,
        forumTitle: forum.title,
      },
    });

    console.log(`🔔 Notification sent to user`);
  } catch (notifErr) {
    console.error(`⚠️  Failed to create notification:`, notifErr);
    // Non-blocking
  }
}
```

---

### Step 11: Invalidate Forum Cache

```javascript
// 13. INVALIDATE FORUM CACHE (update timestamp)
await supabase
  .from("forums")
  .update({ updated_at: new Date().toISOString() })
  .eq("id", originalComment.forum_id);

console.log(`🔄 Forum cache invalidated`);
```

---

### Step 12: Return Response

```javascript
    // 14. RETURN 200 OK
    return res.json({
      comment: updatedComment,
      pointsChange: {
        old: oldPointsAwarded,
        new: newPointsAwarded,
        difference: pointsDifference
      },
      userPoints: {
        previous: userCurrentPoints,
        current: calculatedPoints
      },
      message: pointsDifference > 0
        ? `Comment updated! You gained ${pointsDifference} points.`
        : pointsDifference < 0
        ? `Comment updated. You lost ${Math.abs(pointsDifference)} points due to lower quality.`
        : `Comment updated. Points unchanged.`
    });

  } catch (err) {
    console.error("Update Comment Error:", err);
    return res.status(500).json({ error: "Failed to update comment" });
  }
}
```

---

## Edge Cases & Handling

### Case 1: User Edits to Lower Quality

**Scenario:** Original comment scored 8/10, edit scores 5/10

```
User Points: 100
Old points: 8
New points: 5

New User Points = 100 - 8 + 5 = 97 ✅
```

**Result:** User loses 3 points (negative difference is OK)

---

### Case 2: Multiple Edits in Succession

**Scenario:** User edits comment 3 times

```
Initial Post: Score 6/10
  User Points: 50 - 0 + 6 = 56

First Edit: Score 8/10
  User Points: 56 - 6 + 8 = 58 (+2)

Second Edit: Score 7/10
  User Points: 58 - 8 + 7 = 57 (-1)

Third Edit: Score 9/10
  User Points: 57 - 7 + 9 = 59 (+2)

Final Result: 59 points (correct!) ✅
```

---

### Case 3: Edit Reduces Points to Zero

**Scenario:** Original comment scored 5/10, edit scores 0/10

```
User Points: 100
Old points: 5
New points: 0

Status: 422 Unprocessable Entity
Error: "Cannot update comment - quality check failed"
Action: Edit REJECTED, comment unchanged ❌
```

**Result:**

- Comment NOT updated
- Points NOT changed (still 100)
- User notified of failure

---

### Case 4: Sources Invalid After Edit

**Scenario:** Edit adds invalid URLs

```
TIER 1: New points = 7
TIER 2: Source validation finds invalid URL
   → Adjustment: -1 (15% of 7 = 1)

Final Points: 6
User Points: Previous - 7 + 6 = Previous - 1 ✅
```

---

### Case 5: Comment Deleted During Edit

**Scenario:** Comment was deleted by admin/user before edit completed

```
GET comment by ID:
  → No result found
  → Return 404 "Comment not found"
  → Event: Notify user via notification
```

---

## Idempotency & Safety

### Preventing Double-Updates

**Problem:** Network retry could apply points twice

**Solution:** Use point recalculation algorithm

```javascript
// Even if called twice:
Call 1: 50 - 5 + 8 = 53 ✅
Call 2: 53 - 8 + 8 = 53 ✅ (idempotent!)
```

The algorithm handles this because we **always fetch current DB state** before calculating.

---

### Transaction Safety

**Current Implementation:** Sequential individual updates

```javascript
// 1. Update comment
await supabase.from("comments").update(...).eq("id", id);

// 2. Update user
await supabase.from("users").update(...).eq("id", userId);
```

**Future Improvement:** Supabase RPC Transaction

```sql
BEGIN;
  UPDATE comments SET points_awarded = 8 WHERE id = '...';
  UPDATE users SET points = 53 WHERE id = '...';
COMMIT;
```

---

## Monitoring & Logging

### Console Output Example

```
📝 User 123e4567-e89b-12d3-a456-426614174000 editing comment 550e8400-e29b-41d4-a716-446655440000
   Original points: 5
   Original content length: 156
🔍 Forum context: "Advanced Calculus Techniques"
🤖 Starting re-validation of edited comment...
✅ Re-validation complete: 7/10 points
   Reason: Clearer explanation than original
💰 Point calculation for comment 550e8400-e29b-41d4-a716-446655440000:
   Old: 5 pts
   New: 7 pts
   Difference: +2 pts
📊 User point recalculation:
   42 - 5 + 7 = 44
✅ Comment updated with new content & points
✅ User 123e4567-e89b-12d3-a456-426614174000 points updated: 42 → 44
🔗 Starting Tier 2 source validation...
✅ All sources validated successfully
📡 Emitted comment:updated event
🔔 Notification sent to user
🔄 Forum cache invalidated
```

---

## Performance Metrics

| Operation        | Latency        | Notes                   |
| ---------------- | -------------- | ----------------------- |
| Fetch comment    | ~5-10ms        | Single query with joins |
| AI re-validation | ~500-1500ms    | Depends on model        |
| URL validation   | ~2-5s per URL  | Serial requests         |
| DB updates       | ~10-20ms total | Parallel-ready          |
| Total request    | ~3-7s          | Mostly AI bottleneck    |

---

## Implementation Checklist

- ✅ Authorization check (author only)
- ✅ Content validation (non-empty)
- ✅ AI re-validation via service
- ✅ Zero-points rejection handling
- ✅ Point difference calculation
- ✅ Atomic point recalculation formula
- ✅ Comment DB update
- ✅ User points DB update
- ✅ Tier 2 source validation (post-update)
- ✅ Event emission (Socket.IO)
- ✅ Notification creation
- ✅ Forum cache invalidation
- ✅ Error handling & rollback
- ⚠️ Supabase transaction wrapping
- ⚠️ Concurrent edit conflict detection
- ⚠️ Audit logging of point changes

---

## Related Systems

- **Comment Pointing (Creation):** See doc #2
- **AI Service:** AIService.validatePoints()
- **Tier 2 Validation:** CommentModerationService.validateSourcesAfterPoints()
- **Notifications:** NotificationService
- **Real-time Events:** Socket.IO middleware
