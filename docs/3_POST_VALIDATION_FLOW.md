# 3. Post Validation Flow & Update Instances

## Overview

Posts (forums) in Academiq go through a **validation pipeline** that determines their visibility and quality status. The system uses background async processing to avoid blocking user submission while ensuring academic standards.

---

## System Architecture

```
User Submits Post
    ↓
✅ Save to Database (validation_status = "pending")
    ↓
▶️ Return 202 Immediately (accept without validation)
    ↓
🔄 Background: AI Validation Service (Async)
    ├─ Fetch tags, subject, content
    ├─ Call AI /validate endpoint
    ├─ Receive verdict: "approved" | "rejected"
    └─ Update forum.validation_status
    ↓
📦 Backup Original Data (if editing)
    ├─ Store in forum_edit_backups table
    ├─ Preserve for rollback
    └─ Keep for rejected forum recovery
    ↓
🔔 Notification Sent to User
    ├─ "Approved: Your post is visible"
    ├─ "Rejected: Reason is..."
    └─ Link to rejected forum details
    ↓
✨ Update Forum Cache & Trigger Achievements
```

---

## Database Schema

### Forums Table

```sql
CREATE TABLE forums (
  id UUID PRIMARY KEY,

  -- Content
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  document_url TEXT,

  -- Relationships
  user_id UUID REFERENCES users(id),
  subject_id UUID REFERENCES subjects(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Engagement
  upvotes_count INT DEFAULT 0,
  downvotes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,

  -- Validation Status
  validation_status VARCHAR(20) DEFAULT 'pending',
    -- pending | approved | rejected | failed
  validation_reason TEXT,

  -- AI Verification
  is_ai_verified BOOLEAN DEFAULT FALSE,
  ai_summary TEXT,

  -- Semantic Embeddings
  embedding vector(1536),

  -- Internal
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_forums_user_id ON forums(user_id);
CREATE INDEX idx_forums_subject_id ON forums(subject_id);
CREATE INDEX idx_forums_validation_status ON forums(validation_status);
CREATE INDEX idx_forums_is_ai_verified ON forums(is_ai_verified);
CREATE INDEX idx_forums_created_at ON forums(created_at DESC);
```

### Forum Edit Backups Table

```sql
CREATE TABLE forum_edit_backups (
  id UUID PRIMARY KEY,
  forum_id UUID REFERENCES forums(id) UNIQUE,
  original_data JSONB NOT NULL,       -- Original content before edit
  backup_created_at TIMESTAMP DEFAULT NOW(),
  reason VARCHAR(50),                 -- 'pending_validation', 'rejected', 'update'
  validated_at TIMESTAMP
);

CREATE INDEX idx_forum_edit_backups_forum_id
  ON forum_edit_backups(forum_id);
```

---

## Post Creation Flow

### Step 1: Immediate Save (Non-blocking)

**File:** `forum_controller.js:createForum()`

```javascript
async createForum(req, res) {
  const userId = req.user?.id;
  const { title, content, tagIds = [], subject, subject_id } = req.body;

  // 1a. Get user details for watermarking
  const user = await UserModel.findById(userId);

  // 1b. Upload document if provided (PDF watermarking)
  const uploadedDocumentUrl = await uploadForumAttachment(
    req.file,
    userId,
    user.name,
    user.school
  ).catch(err => {
    console.error("Upload error:", err);
    return null;  // Continue without document
  });

  // 1c. Create or fetch subject
  let finalSubjectId = subject_id;
  if (subject && !subject_id) {
    const { data: foundSubject } = await SubjectModel.findByName(subject);
    if (foundSubject) {
      finalSubjectId = foundSubject.id;
    } else {
      const { data: newSubject } = await supabase
        .from("subjects")
        .insert({ name: subject })
        .select()
        .single();
      finalSubjectId = newSubject.id;
    }
  }

  // 2. SAVE IMMEDIATELY with status = "pending"
  const payload = {
    title,
    content,
    user_id: userId,
    subject_id: finalSubjectId,
    document_url: uploadedDocumentUrl || null,
    validation_status: "pending",      // ← KEY: post is pending validation
    is_ai_verified: false
  };

  const { data: forum, error } = await ForumModel.create(payload);
  if (error) throw error;

  // 3. Associate tags (don't update usage counts yet - only if approved)
  if (Array.isArray(tagIds) && tagIds.length > 0) {
    await setForumTags(forum.id, tagIds, false);  // false = don't update counts
  }

  // 4. RETURN 202 (Accepted, processing)
  return res.status(202).json({
    forum,
    message: "Post created and queued for validation. You will be notified once reviewed."
  });
}
```

**Response Code:**

- `202 Accepted` - Post stored but validation pending
- ✅ Non-blocking return
- ✅ User can continue using app

---

### Step 2: Background Validation (Fire & Forget)

```javascript
  // 5. BACKGROUND VALIDATION - Don't await, use setImmediate
  setImmediate(async () => {
    try {
      console.log(`🔄 Starting validation for forum ${forum.id}...`);

      // 5a. Fetch tag names for context
      let tagNames = [];
      if (tagIds.length > 0) {
        const { data: tags } = await supabase
          .from("tags")
          .select("name")
          .in("id", tagIds);
        if (tags) tagNames = tags.map(t => t.name);
      }

      // 5b. Prepare validation payload
      const validationPayload = {
        subject: subject || "General",
        title,
        content,
        tags: tagNames,
        document_url: uploadedDocumentUrl
      };

      // 5c. Call AI validation endpoint
      console.log(`🤖 Calling AI validation endpoint...`);
      const validationRes = await fetch(`${AI_SERVICE_URL}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validationPayload)
      });

      // 5d. Parse AI response
      let validation;
      if (validationRes.ok) {
        validation = await validationRes.json();
      } else {
        console.error("AI service error:", validationRes.status);
        validation = {
          verdict: "rejected",
          reason: "Validation service error"
        };
      }

      const isApproved = validation.verdict === "approved";
      console.log(`✅ AI Verdict: ${validation.verdict} | Reason: ${validation.reason}`);

      // 5e. Update forum with validation result
      const updateData = {
        validation_status: isApproved ? "approved" : "rejected",
        validation_reason: validation.reason || null,
        is_ai_verified: isApproved
      };

      await supabase
        .from("forums")
        .update(updateData)
        .eq("id", forum.id);

      console.log(`📝 Forum ${forum.id} status → ${updateData.validation_status}`);
```

---

### Step 3: Store Backup for Rejected Posts

```javascript
// 6. If rejected, store backup for potential recovery
if (!isApproved) {
  console.log(`📦 Storing backup of rejected forum...`);

  // Store original forum data
  await supabase
    .from("forum_edit_backups")
    .insert({
      forum_id: forum.id,
      original_data: forum, // Full forum object as JSONB
      reason: "rejected",
      backup_created_at: new Date().toISOString(),
    })
    .throwOnError();

  console.log(`✅ Backup stored for rejected forum ${forum.id}`);
}
```

---

### Step 4: Delete Rejected Posts

```javascript
// 7. If rejected, DELETE from database
if (!isApproved) {
  try {
    console.log(`🗑️ Deleting rejected forum ${forum.id}...`);

    // Delete forum tags first and update usage counts
    const { data: forumTags } = await supabase
      .from("forum_tags")
      .select("tag_id")
      .eq("forum_id", forum.id);

    const tagIds = forumTags?.map((t) => t.tag_id) || [];

    // Delete the forum
    await ForumModel.delete(forum.id);

    // Update tag usage counts (decrease)
    for (const tagId of tagIds) {
      await TagModel.updateUsageCount(tagId, -1);
    }

    console.log(`✅ Rejected forum ${forum.id} deleted from database`);
  } catch (deleteErr) {
    console.error(`Failed to delete rejected forum:`, deleteErr);
  }
}
```

---

### Step 5: Notify User

```javascript
// 8. Create notification
console.log(`🔔 Creating notification for user ${forum.user_id}...`);

await NotificationService.createNotification({
  userId: forum.user_id,
  type: "forum_validation",
  referenceId: forum.id,
  message: isApproved
    ? `✅ Your post "${forum.title}" has been approved and is now visible to others.`
    : `❌ Your post "${forum.title}" was rejected. Reason: ${validation.reason}`,
  metadata: {
    forumId: forum.id,
    forumTitle: forum.title,
    verdict: validation.verdict,
    reason: validation.reason,
    tags: tagNames,
  },
});

console.log(`✅ Notification sent`);
```

---

### Step 6: Trigger Achievements

```javascript
      // 9. If approved, trigger achievement evaluation
      if (isApproved) {
        console.log(`🏆 Triggering achievements...`);
        AchievementService.triggerOnPostCreated(forum.user_id).catch(err =>
          console.error("Achievement evaluation error:", err)
        );
      }

      console.log(`✅ Validation complete for forum ${forum.id}`);
    } catch (err) {
      console.error(`Background validation failed for forum ${forum.id}:`, err);

      // Mark as failed so it can be retried
      await supabase
        .from("forums")
        .update({ validation_status: "failed" })
        .eq("id", forum.id);
    }
  });
```

---

## Updating Posts (Edit Flow)

### When Users Can Edit

**Constraints:**

- ✅ Only author can edit their own post
- ✅ Can edit if `validation_status = "approved"`
- ❌ Cannot edit if `validation_status = "pending"` (awaiting validation)
- ❌ Cannot edit if `validation_status = "rejected"` (deleted from DB)

**File:** `forum_controller.js:updateForum()`

```javascript
async updateForum(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;
  const { title, content, tagIds = [] } = req.body;

  // 1. Fetch current forum
  const { data: forum, error } = await ForumModel.findByIdUnfiltered(id);
  if (error || !forum) {
    return res.status(404).json({ error: "Post not found" });
  }

  // 2. Authorization check
  if (String(forum.user_id) !== String(userId)) {
    return res.status(403).json({ error: "Not authorized to edit" });
  }

  // 3. Status check - only allow editing approved posts
  if (forum.validation_status !== "approved") {
    return res.status(422).json({
      error: `Cannot edit posts with status: ${forum.validation_status}`,
      currentStatus: forum.validation_status
    });
  }

  console.log(`✏️  Updating forum ${id} by user ${userId}`);
```

---

### Update Steps

```javascript
// 4. CREATE BACKUP before modifying
console.log(`📦 Creating backup of current post...`);

await supabase
  .from("forum_edit_backups")
  .upsert({
    forum_id: forum.id,
    original_data: forum, // Store current state
    reason: "update",
    backup_created_at: new Date().toISOString(),
  })
  .throwOnError();

console.log(`✅ Backup created`);

// 5. RE-VALIDATE edited content
console.log(`🔄 Re-validating edited content...`);

let tagNames = [];
if (tagIds.length > 0) {
  const { data: tags } = await supabase
    .from("tags")
    .select("name")
    .in("id", tagIds);
  tagNames = tags?.map((t) => t.name) || [];
}

const validationPayload = {
  subject: forum.subject?.name || "General",
  title: title || forum.title,
  content: content || forum.content,
  tags: tagNames,
};

const validationRes = await fetch(`${AI_SERVICE_URL}/validate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(validationPayload),
});

let validation;
if (validationRes.ok) {
  validation = await validationRes.json();
} else {
  validation = {
    verdict: "rejected",
    reason: "Validation error",
  };
}

const isApproved = validation.verdict === "approved";

console.log(`🤖 Re-validation result: ${validation.verdict}`);
```

---

### Handle Rejection During Edit

```javascript
  // 6a. If re-validation REJECTS, ROLLBACK to original
  if (!isApproved) {
    console.log(`❌ Re-validation rejected. Rolling back...`);

    await NotificationService.createNotification({
      userId: forum.user_id,
      type: "forum_regraded_rejected",
      referenceId: forum.id,
      message: `Your edited post "${forum.title}" was rejected during re-validation. Changes have been rolled back.`,
      metadata: {
        forumId: forum.id,
        reason: validation.reason,
        action: "rollback_to_original"
      }
    });

    return res.status(422).json({
      error: "Edited content was rejected",
      reason: validation.reason,
      message: "Your changes have been rolled back to the previous approved version"
    });
  }

  // 6b. If approved, save changes
  console.log(`✅ Re-validation approved. Saving changes...`);

  const updatePayload = {
    title: title || forum.title,
    content: content || forum.content,
    updated_at: new Date().toISOString()
  };

  const { data: updatedForum, error: updateErr } = await ForumModel.update(
    id,
    updatePayload
  );

  if (updateErr) throw updateErr;

  // 7. Update tags (sync with new tagIds)
  const parsedTagIds = typeof tagIds === "string"
    ? JSON.parse(tagIds)
    : tagIds;

  if (Array.isArray(parsedTagIds) && parsedTagIds.length > 0) {
    await setForumTags(id, parsedTagIds, true);  // true = update usage counts
  }

  // 8. Invalidate cache
  await supabase
    .from("forums")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  // 9. Notify user of successful edit
  await NotificationService.createNotification({
    userId: forum.user_id,
    type: "forum_updated",
    referenceId: forum.id,
    message: `Your post "${updatedForum.title}" has been successfully updated and remains visible.`,
    metadata: {
      forumId: id,
      previousTitle: forum.title,
      newTitle: updatedForum.title
    }
  });

  return res.json({
    forum: updatedForum,
    message: "Post updated successfully"
  });
}
```

---

## Status Transitions

### Valid State Transitions

```
┌─────────────┐
│  Pending    │  (Initial state after creation)
└──────┬──────┘
       │
       ├─ AI Validation
       │
       ├──────────────────┬──────────────────┐
       v                  v                  v
   ┌────────┐        ┌─────────┐       ┌───────┐
   │Approved│        │Rejected │       │Failed │
   └────────┘        └─────────┘       └───────┘
       │                  │                  │
       │ (Edit)           │ (Deleted)        │ (Retry)
       │                  │                  │
       ├──────────┬───────┘                  │
       v          v                          v
   ┌─────────────────────────────────────────┘
   │ (Stay Approved, Rollback, or Reject)
   └─────────────────────────────────────────┘
```

### Status Descriptions

| Status       | Meaning                | User Actions          | Visibility                |
| ------------ | ---------------------- | --------------------- | ------------------------- |
| **pending**  | Awaiting AI validation | Wait for notification | Hidden (only author)      |
| **approved** | Passed validation      | Edit, delete, vote    | Public                    |
| **rejected** | Failed validation      | Resubmit, view reason | Hidden (deleted) → Backup |
| **failed**   | Validation error       | Automatic retry       | Hidden (retry queued)     |

---

## Backup & Recovery

### When Backups Are Created

```javascript
// 1. Post rejected during initial validation
reason: "rejected";

// 2. Post edited (backup of previous state)
reason: "update";

// 3. Admin approval override
reason: "admin_override";
```

### Retrieving Backed-up Post

**File:** `forum_controller.js:getForumById()`

```javascript
async getForumById(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;

  // Fetch current forum
  const { data: forum } = await ForumModel.findByIdUnfiltered(id);

  // If pending → get original backup (approved version)
  if (forum.validation_status === "pending") {
    const { data: backup } = await supabase
      .from("forum_edit_backups")
      .select("original_data")
      .eq("forum_id", id)
      .single();

    if (backup && backup.original_data) {
      console.log(`📦 Returning backed-up version of pending post`);
      return res.json({ forum: backup.original_data });
    }
  }

  return res.json({ forum });
}
```

---

## Validation Criteria

### AI Validation Checks

**File:** FastAPI `validation_router.py`

```
✅ Checks:
  1. Academic Relevance
     - Does content relate to the subject?
     - Is it on-topic for academic discussion?

  2. Quality & Clarity
     - Is content well-structured?
     - Is it free from spam/gibberish?

  3. Safety & Guidelines
     - No hate speech, violence, harassment
     - No plagiarized content
     - No NSFW material

  4. Spam Detection
     - Duplicate posts (fingerprint matching)
     - Marketing/promotional content
     - Link farming

❌ Rejection Reasons:
  - "Invalid subject area"
  - "Insufficient content quality"
  - "Potential spam detected"
  - "Safety policy violation"
  - "Likely duplicate of existing post"
```

---

## Performance & Monitoring

### Metrics to Track

```javascript
// Validation latency
const startTime = Date.now();
const validation = await aiService.validate(...);
const latencyMs = Date.now() - startTime;
console.log(`AI validation took ${latencyMs}ms`);

// Approval rate
const { count: totalValidated } = await supabase
  .from("forums")
  .select("*", { count: "exact" })
  .neq("validation_status", "pending");

const { count: approved } = await supabase
  .from("forums")
  .select("*", { count: "exact" })
  .eq("validation_status", "approved");

const approvalRate = (approved / totalValidated) * 100;
console.log(`Approval rate: ${approvalRate.toFixed(2)}%`);
```

---

## Implementation Checklist

- ✅ Forums table with validation_status column
- ✅ AI validation endpoint (/validate)
- ✅ Fire-and-forget background validation
- ✅ Notification system for verdict
- ✅ forum_edit_backups table
- ✅ Update flow with re-validation
- ✅ Rollback on rejection during edit
- ✅ Tag usage count sync
- ✅ Automatic deletion of rejected posts
- ✅ Cache invalidation on update
- ⚠️ Admin override UI
- ⚠️ Appeal process for rejected posts
- ⚠️ Batch re-validation for historical posts

---

## Related Systems

- **Comment Validation:** See doc #2
- **AI Service:** FastAPI validation endpoint
- **Notifications:** notification_service.js
- **Achievements:** achievement_service.js
