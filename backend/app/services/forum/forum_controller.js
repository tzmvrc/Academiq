import path from "path";
import { ForumModel } from "../../models/forum_model.js";
import { NotificationService } from "../../services/notification/notification_service.js";
import { CommentModel } from "../../models/comment_model.js";
import { SubjectModel } from "../../models/subject_model.js";
import { TagModel } from "../../models/tag_model.js";
import { VotesModel } from "../../models/votes_model.js";
import { UserModel } from "../../models/user_model.js";
import { supabase } from "../../database/supabase.js";
import { addWatermarkToPDF } from "../watermark/watermarkService.js";
import { generateForumEmbedding } from "../embedding/embeddingService.js";
import { setCacheHeaders, shouldReturn304 } from "../../utils/cacheHeaders.js";
import { ActivityService } from "../activity_service.js";
import { getIO } from "../../middlewares/socket.js";

// Setup AI Service URL - normalize to ensure /ai suffix
let AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000/ai";
AI_SERVICE_URL =
  AI_SERVICE_URL.replace(/\/ai\/?$/, "").replace(/\/$/, "") + "/ai";

console.log(`🤖 AI Service URL for forum validation: ${AI_SERVICE_URL}`);

const POST_DOCUMENT_BUCKET = "post_document";

const slugifyFileName = (name = "file") => {
  return name
    .replace(/\.[^/.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const uploadForumAttachment = async (file, userId, userName, schoolName) => {
  if (!file) return null;

  let watermarkedBuffer = file.buffer;

  // Apply watermark only to PDFs
  if (file.mimetype === "application/pdf") {
    try {
      watermarkedBuffer = await addWatermarkToPDF(
        file.buffer,
        userName,
        schoolName,
      );
      console.log(`✅ Watermarked PDF for user ${userId}`);
    } catch (err) {
      console.error("Watermarking failed, uploading original:", err);
      // fallback to original buffer
    }
  }
  // DOCX and other types are uploaded as‑is (no watermark)

  const ext = path.extname(file.originalname || "").toLowerCase();
  const baseName = slugifyFileName(file.originalname || "attachment");
  const filePath = `forums/${userId}/${Date.now()}-${baseName}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(POST_DOCUMENT_BUCKET)
    .upload(filePath, watermarkedBuffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    // If bucket doesn't exist or upload fails, log error but continue
    console.warn(`⚠️ Document upload failed: ${uploadError.message}`);
    return null; // Return null instead of throwing, allows forum creation to proceed
  }

  const { data: publicUrlData } = supabase.storage
    .from(POST_DOCUMENT_BUCKET)
    .getPublicUrl(filePath);

  return publicUrlData?.publicUrl || null;
};

// Helper: set tags for a forum and update usage counts
const setForumTags = async (forumId, newTagIds, updateCounts = true) => {
  // Get existing tag IDs
  const { data: existingRows } = await supabase
    .from("forum_tags")
    .select("tag_id")
    .eq("forum_id", forumId);
  const existingTagIds = existingRows?.map((row) => row.tag_id) || [];

  // Determine added and removed tags
  const added = newTagIds.filter((id) => !existingTagIds.includes(id));
  const removed = existingTagIds.filter((id) => !newTagIds.includes(id));

  // Update forum_tags table
  if (added.length > 0) {
    const rows = added.map((tagId) => ({ forum_id: forumId, tag_id: tagId }));
    const { error: insertError } = await supabase
      .from("forum_tags")
      .insert(rows);
    if (insertError) throw insertError;
  }
  if (removed.length > 0) {
    const { error: deleteError } = await supabase
      .from("forum_tags")
      .delete()
      .eq("forum_id", forumId)
      .in("tag_id", removed);
    if (deleteError) throw deleteError;
  }

  // Only update usage counts if requested
  if (updateCounts) {
    for (const tagId of added) {
      await TagModel.updateUsageCount(tagId, 1);
    }
    for (const tagId of removed) {
      await TagModel.updateUsageCount(tagId, -1);
    }
  }
};

export const ForumsController = {
  // GET /api/forums
  async getAllForums(req, res) {
    try {
      const { subjectId, tagId, limit = 10, offset = 0 } = req.query;
      const parsedLimit = parseInt(limit, 10);
      const parsedOffset = parseInt(offset, 10);

      let query = supabase.from("forums").select(
        `
      *,
      user:user_id(id, name, profile_url, school),
      subject:subject_id(id, name),
      forum_tags( tag:tag_id(id, name, slug, usage_count) )
    `,
        { count: "exact" },
      );

      if (subjectId) query = query.eq("subject_id", subjectId);
      if (tagId) {
        const { data: forumIds } = await supabase
          .from("forum_tags")
          .select("forum_id")
          .eq("tag_id", tagId);
        const ids = forumIds.map((ft) => ft.forum_id);
        if (ids.length === 0)
          return res.json({ forums: [], hasMore: false, total: 0 });
        query = query.in("id", ids);
      }

      // Filter to only approved & verified forums
      query = query
        .eq("validation_status", "approved")
        .eq("is_ai_verified", true);

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(parsedOffset, parsedOffset + parsedLimit - 1);

      if (error) throw error;

      const forums = data.map((forum) => ({
        ...forum,
        tags: (forum.forum_tags || []).map((ft) => ft.tag).filter(Boolean),
        forum_tags: undefined,
      }));

      const hasMore = count
        ? parsedOffset + parsedLimit < count
        : data.length === parsedLimit;

      // --- HTTP Caching ---
      let lastModified = new Date();
      if (forums.length > 0) {
        const latestTimestamp = Math.max(
          ...forums.map((f) =>
            new Date(f.updated_at || f.created_at).getTime(),
          ),
        );
        lastModified = new Date(latestTimestamp);
      }

      const responsePayload = { forums, hasMore, total: count || 0 };

      if (shouldReturn304(req, res, responsePayload, lastModified)) {
        return res.status(304).end();
      }

      setCacheHeaders(res, responsePayload, lastModified, {
        isPrivate: false,
        maxAgeSeconds: 60,
      });

      res.json(responsePayload);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch forums" });
    }
  },

  async getForumById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      console.log(`🔍 getForumById: id=${id}, userId=${userId}`);

      // Fetch the forum (unfiltered, may be pending/approved)
      const { data: forum, error } = await ForumModel.findByIdUnfiltered(id);
      if (error) throw error;
      if (!forum) {
        return res.status(404).json({ error: "Forum not found" });
      }

      let forumToReturn = forum;

      // If the forum is pending, try to return the original approved version from backup
      if (forum.validation_status === "pending") {
        const { data: backup, error: backupError } = await supabase
          .from("forum_edit_backups")
          .select("original_data")
          .eq("forum_id", id)
          .single();

        if (backup && backup.original_data) {
          forumToReturn = backup.original_data;
          // Ensure relations are attached (user, subject, tags)
          if (!forumToReturn.user && forum.user)
            forumToReturn.user = forum.user;
          if (!forumToReturn.subject && forum.subject)
            forumToReturn.subject = forum.subject;
          if (!forumToReturn.tags && forum.tags)
            forumToReturn.tags = forum.tags;
          console.log(`📦 Pending forum ${id} – returning original backup`);
        } else {
          console.warn(
            `⚠️ Pending forum ${id} has no backup – returning pending version`,
          );
        }
      } else {
        // Approved or rejected – return the forum as is
        console.log(
          `✅ Forum ${id} status = ${forum.validation_status} – returning current version`,
        );
      }

      // Disable caching completely for this endpoint to avoid stale data
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      // 📊 Log view activity for personalization (if user is logged in)
      if (userId) {
        ActivityService.logActivityAsync(userId, id, "view", forumToReturn);
      }

      res.json({ forum: forumToReturn });
    } catch (err) {
      console.error("Get Forum Error:", err);
      res.status(404).json({ error: "Forum not found" });
    }
  },

  async getUserForums(req, res) {
    try {
      const { userId, limit = 10, offset = 0 } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      // Check if the current user is viewing their own profile
      const currentUserId = req.user?.id;
      const isOwnProfile = String(currentUserId) === String(userId);

      // Use appropriate method based on ownership
      let result;
      if (isOwnProfile) {
        // Show all statuses for own profile (pending, approved, rejected)
        result = await ForumModel.findByUserIdAll(
          userId,
          parseInt(limit),
          parseInt(offset),
        );
      } else {
        // Show only approved for other users' profiles
        result = await ForumModel.findByUserId(
          userId,
          parseInt(limit),
          parseInt(offset),
        );
      }

      const { data, error } = result;
      if (error) throw error;
      res.json({ forums: data });
    } catch (err) {
      console.error("Error fetching user forums:", err);
      res.status(500).json({ error: "Failed to fetch forums" });
    }
  },

  async getUserComments(req, res) {
    try {
      const { userId, limit = 10, offset = 0 } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }
      const { data, error } = await CommentModel.findByUserId(
        userId,
        parseInt(limit),
        parseInt(offset),
      );
      if (error) throw error;
      res.json({ comments: data });
    } catch (err) {
      console.error("Error fetching user comments:", err);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  },

  async getMyForums(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { data, error } = await supabase
        .from("forums")
        .select(
          `
        id,
        title,
        content,
        upvotes_count,
        comments_count,
        created_at,
        subject:subject_id ( id, name )
      `,
        )
        .eq("user_id", userId)
        .eq("validation_status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json({ forums: data });
    } catch (err) {
      console.error("Get My Forums Error:", err);
      res.status(500).json({ error: "Failed to fetch user forums" });
    }
  },

  // POST /api/forums
  async createForum(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const user = await UserModel.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      let { tagIds = [], subject, subject_id, title, content } = req.body;
      if (typeof tagIds === "string") {
        try {
          tagIds = JSON.parse(tagIds);
        } catch {
          tagIds = [];
        }
      }

      // --- 1. Save post immediately with validation_status = "pending" ---
      let finalSubjectId = subject_id;
      if (subject && !subject_id) {
        const { data: foundSubject } = await SubjectModel.findByName(subject);
        if (foundSubject) {
          finalSubjectId = foundSubject.id;
        } else {
          const { data: newSubject, error: createErr } = await supabase
            .from("subjects")
            .insert({ name: subject })
            .select()
            .single();
          if (createErr) throw createErr;
          finalSubjectId = newSubject.id;
        }
      }

      const uploadedDocumentUrl = await uploadForumAttachment(
        req.file,
        userId,
        user.name || "User",
        user.school || "School",
      ).catch((err) => {
        console.error("Document upload error:", err);
        return null; // Continue without document if upload fails
      });

      const payload = {
        title,
        content,
        user_id: userId,
        subject_id: finalSubjectId,
        document_url: uploadedDocumentUrl || null,
        validation_status: "pending", // new column
      };

      const { data: forum, error } = await ForumModel.create(payload);
      if (error) throw error;

      if (Array.isArray(tagIds) && tagIds.length > 0) {
        await setForumTags(forum.id, tagIds, false);
      }

      // --- 2. Trigger background validation (non‑blocking) ---
      setImmediate(async () => {
        try {
          // Fetch tag names for validation
          let tagNames = [];
          if (tagIds.length > 0) {
            const { data: tags } = await supabase
              .from("tags")
              .select("name")
              .in("id", tagIds);
            if (tags) tagNames = tags.map((t) => t.name);
          }

          const validationPayload = {
            subject: subject || "General",
            title,
            content,
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
              reason: "Validation service error",
            };
          }

          // Update forum with validation result
          const updateData = {
            validation_status:
              validation.verdict === "approved" ? "approved" : "rejected",
            validation_reason: validation.reason || null,
            is_ai_verified: validation.verdict === "approved",
          };
          await supabase.from("forums").update(updateData).eq("id", forum.id);

          // --- Generate embedding asynchronously (only if approved) ---
          if (validation.verdict === "approved") {
            // 🚀 Emit real-time feed boost event with complete forum data
            try {
              const io = getIO();
              if (io) {
                // Fetch complete forum data with relations
                const { data: completeForum } =
                  await ForumModel.findByIdUnfiltered(forum.id);
                if (completeForum) {
                  io.emit("forum:new", {
                    forumId: completeForum.id,
                    title: completeForum.title,
                    content: completeForum.content,
                    user: {
                      id: completeForum.user_id,
                      name: completeForum.user?.name || "Unknown",
                      profile_url: completeForum.user?.profile_url || null,
                      school: completeForum.user?.school || null,
                    },
                    subject: {
                      id: completeForum.subject_id,
                      name: completeForum.subject?.name || "General",
                    },
                    created_at: completeForum.created_at,
                    timestamp: new Date().toISOString(),
                  });
                  console.log(
                    `📢 Emitted forum:new event for forum ${completeForum.id} (${completeForum.title})`,
                  );
                }
              }
            } catch (socketErr) {
              console.warn("Failed to emit forum:new event:", socketErr);
              // Non-critical, continue anyway
            }

            setImmediate(async () => {
              try {
                console.log(`🔄 Generating embedding for forum ${forum.id}...`);
                const embedding = await generateForumEmbedding(
                  forum.title,
                  forum.content,
                );
                await ForumModel.saveEmbedding(forum.id, embedding);
                console.log(`✅ Embedding saved for forum ${forum.id}`);

                // Invalidate user's interest vector to trigger recompute on next feed fetch
                await UserModel.invalidateInterestVector(userId).catch((err) =>
                  console.warn(
                    "Failed to invalidate user interest vector:",
                    err,
                  ),
                );
              } catch (embErr) {
                console.error(
                  `Failed to generate embedding for forum ${forum.id}:`,
                  embErr,
                );
                // Embedding generation failure is non-critical
              }
            });
          }

          // --- 3. Notify user (example: create a notification) ---
          await NotificationService.createNotification({
            userId: forum.user_id,
            type: "forum_validation",
            referenceId: forum.id,
            message:
              validation.verdict === "approved"
                ? `Your post "${forum.title}" has been approved and is now visible.`
                : `Your post "${forum.title}" was rejected: ${validation.reason}`,
            metadata: {
              forumId: forum.id,
              forumTitle: forum.title,
              verdict: validation.verdict,
              reason: validation.reason,
            },
          });

          // If rejected, delete the forum from database
          if (validation.verdict === "rejected") {
            try {
              // Delete forum tags first and update usage counts
              const { data: tags } = await supabase
                .from("forum_tags")
                .select("tag_id")
                .eq("forum_id", forum.id);
              const tagIds = tags?.map((t) => t.tag_id) || [];

              // Delete the forum
              await ForumModel.delete(forum.id);

              // Update tag usage counts
              for (const tagId of tagIds) {
                await TagModel.updateUsageCount(tagId, -1);
              }

              console.log(
                `🗑️ Rejected forum ${forum.id} has been deleted from database`,
              );
            } catch (deleteErr) {
              console.error(
                `Failed to delete rejected forum ${forum.id}:`,
                deleteErr,
              );
            }
          }

          console.log(
            `✅ Validation complete for forum ${forum.id}: ${validation.verdict}`,
          );
        } catch (err) {
          console.error(
            `Background validation failed for forum ${forum.id}:`,
            err,
          );
          // Mark as failed so it can be retried later
          await supabase
            .from("forums")
            .update({ validation_status: "failed" })
            .eq("id", forum.id);
        }
      });

      // --- 4. Return immediate response (post is pending) ---
      return res.status(202).json({
        forum,
        message:
          "Post created and queued for validation. You will be notified once it's reviewed.",
      });
    } catch (err) {
      console.error("Create Forum Error:", err);
      return res.status(500).json({ error: "Failed to create forum" });
    }
  },

  // Get current user's posts with validation_status = "pending"
  async getUserPendingForums(req, res) {
    try {
      const userId = req.user?.id;
      const limit = parseInt(req.query.limit) || 50;

      const { data, error } = await supabase
        .from("forums")
        .select("id, title, created_at, validation_status, validation_reason")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return res.status(200).json({ forums: data });
    } catch (err) {
      console.error("Error fetching user posts:", err);
      return res.status(500).json({ error: "Failed to fetch posts" });
    }
  },

  async updateForum(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // 1. Fetch existing forum (unfiltered)
      const { data: existingForum, error: existingError } =
        await ForumModel.findByIdUnfiltered(id);
      if (existingError || !existingForum) {
        console.error("Existing forum fetch error:", existingError);
        return res.status(404).json({ error: "Forum not found" });
      }

      // 2. Create backup BEFORE any changes
      const { error: backupError } = await supabase
        .from("forum_edit_backups")
        .insert({
          forum_id: id,
          original_data: existingForum,
        });
      if (backupError) {
        console.error("Backup creation failed:", backupError);
        return res.status(500).json({ error: "Could not create edit backup" });
      }

      // 3. Parse incoming data
      let { tagIds, subject, subject_id, title, content } = req.body;
      if (typeof tagIds === "string") {
        try {
          tagIds = JSON.parse(tagIds);
        } catch {
          tagIds = [];
        }
      }

      // 4. Resolve subject_id
      let finalSubjectId = subject_id || existingForum.subject_id;
      if (subject && !subject_id) {
        const { data: foundSubject } = await SubjectModel.findByName(subject);
        if (foundSubject) {
          finalSubjectId = foundSubject.id;
        } else {
          const { data: newSubject, error: createErr } = await supabase
            .from("subjects")
            .insert({ name: subject })
            .select()
            .single();
          if (createErr) throw createErr;
          finalSubjectId = newSubject.id;
        }
      }

      // 5. Prepare update payload (set to pending) – add updated_at
      const updatePayload = {
        title,
        content,
        subject_id: finalSubjectId,
        validation_status: "pending",
        is_ai_verified: false,
        updated_at: new Date().toISOString(), // Force cache bust
      };

      // Handle file upload
      if (req.file) {
        const user = await UserModel.findById(userId);
        const userName = user?.name || "User";
        const schoolName = user?.school || "School";
        updatePayload.document_url = await uploadForumAttachment(
          req.file,
          userId,
          userName,
          schoolName,
        ).catch((err) => {
          console.error("Document upload error during update:", err);
          return null; // Continue without document if upload fails
        });
      }

      // 6. Apply the update
      const { data: updatedForum, error: updateError } =
        await ForumModel.update(id, updatePayload);
      if (updateError) throw updateError;

      // 7. Update tags (temporarily)
      if (tagIds !== undefined) {
        await setForumTags(id, tagIds, false);
      }

      // 8. Run background validation
      setImmediate(async () => {
        try {
          // Fetch tag names for validation
          let tagNames = [];
          if (tagIds && tagIds.length > 0) {
            const { data: tags } = await supabase
              .from("tags")
              .select("name")
              .in("id", tagIds);
            if (tags) tagNames = tags.map((t) => t.name);
          }

          const validationPayload = {
            subject: subject || existingForum.subject?.name || "General",
            title,
            content,
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
              reason: "Validation service error",
            };
          }

          const forumIO = req.app.get("socketio");

          if (validation.verdict === "approved") {
            // APPROVED: make the edit permanent – also update updated_at
            await supabase
              .from("forums")
              .update({
                validation_status: "approved",
                is_ai_verified: true,
                validation_reason: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", id);
            await supabase
              .from("forum_edit_backups")
              .delete()
              .eq("forum_id", id);

            // 🚀 Emit real-time feed boost event for updated forum
            try {
              const io = getIO();
              if (io) {
                // Fetch the updated forum to get fresh data
                const { data: updatedForum } =
                  await ForumModel.findByIdUnfiltered(id);
                if (updatedForum) {
                  io.emit("forum:new", {
                    forumId: updatedForum.id,
                    title: updatedForum.title,
                    content: updatedForum.content,
                    user: {
                      id: updatedForum.user_id,
                      name: updatedForum.user?.name || "Unknown",
                      profile_url: updatedForum.user?.profile_url || null,
                      school: updatedForum.user?.school || null,
                    },
                    subject: {
                      id: updatedForum.subject_id,
                      name: updatedForum.subject?.name || "General",
                    },
                    created_at: updatedForum.created_at,
                    timestamp: new Date().toISOString(),
                  });
                  console.log(
                    `📢 Emitted forum:new event for updated forum ${updatedForum.id} (${updatedForum.title})`,
                  );
                }
              }
            } catch (socketErr) {
              console.warn("Failed to emit forum:new event:", socketErr);
              // Non-critical, continue anyway
            }

            await NotificationService.createNotification({
              userId,
              type: "forum_validation",
              referenceId: id,
              message: `Your updated post "${updatedForum.title}" has been approved and is now visible.`,
              metadata: { forumId: id, verdict: "approved" },
            });

            if (forumIO) {
              forumIO.to(`post_${id}`).emit("forum_validation_completed", {
                forumId: id,
                verdict: "approved",
                forum: await ForumModel.findById(id, userId),
              });
            }
          } else {
            // REJECTED: restore original forum from backup – also update updated_at
            const { data: backup } = await supabase
              .from("forum_edit_backups")
              .select("original_data")
              .eq("forum_id", id)
              .single();

            if (backup) {
              const original = backup.original_data;
              await supabase
                .from("forums")
                .update({
                  title: original.title,
                  content: original.content,
                  subject_id: original.subject_id,
                  document_url: original.document_url,
                  validation_status: original.validation_status,
                  is_ai_verified: original.is_ai_verified,
                  validation_reason: original.validation_reason,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", id);

              const originalTagIds = original.tags?.map((t) => t.id) || [];
              await setForumTags(id, originalTagIds, false);
            }

            await supabase
              .from("forum_edit_backups")
              .delete()
              .eq("forum_id", id);

            await NotificationService.createNotification({
              userId,
              type: "forum_validation",
              referenceId: id,
              message: `Your edit to "${updatedForum.title}" was rejected: ${validation.reason}. Your post has been reverted to its previous approved version.`,
              metadata: {
                forumId: id,
                verdict: "rejected",
                reason: validation.reason,
              },
            });

            if (forumIO) {
              const revertedForum = await ForumModel.findById(id, userId);
              forumIO.to(`post_${id}`).emit("forum_validation_completed", {
                forumId: id,
                verdict: "rejected",
                forum: revertedForum,
              });
            }
          }
        } catch (err) {
          console.error(`Re-validation failed for forum ${id}:`, err);
          const { data: backup } = await supabase
            .from("forum_edit_backups")
            .select("original_data")
            .eq("forum_id", id)
            .single();
          if (backup) {
            const original = backup.original_data;
            await supabase
              .from("forums")
              .update({
                title: original.title,
                content: original.content,
                subject_id: original.subject_id,
                document_url: original.document_url,
                validation_status: original.validation_status,
                is_ai_verified: original.is_ai_verified,
                validation_reason: original.validation_reason,
                updated_at: new Date().toISOString(),
              })
              .eq("id", id);
            await supabase
              .from("forum_edit_backups")
              .delete()
              .eq("forum_id", id);
          } else {
            await supabase
              .from("forums")
              .update({
                validation_status: "failed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", id);
          }
        }
      });

      return res.status(202).json({
        forum: updatedForum,
        message:
          "Edit submitted for review. Your post will be updated only after approval.",
      });
    } catch (err) {
      console.error("Update Forum Error:", err);
      return res.status(500).json({ error: "Failed to update forum" });
    }
  },

  // DELETE /api/forums/:id
  async deleteForum(req, res) {
    try {
      const { id } = req.params;

      const { data: tags } = await supabase
        .from("forum_tags")
        .select("tag_id")
        .eq("forum_id", id);
      const tagIds = tags?.map((t) => t.tag_id) || [];

      const { error } = await ForumModel.delete(id);
      if (error) throw error;

      for (const tagId of tagIds) {
        await TagModel.updateUsageCount(tagId, -1);
      }

      res.json({ message: "Forum deleted successfully" });
    } catch (err) {
      console.error("Delete Forum Error:", err);
      res.status(500).json({ error: "Failed to delete forum" });
    }
  },

  async voteForum(req, res) {
    try {
      console.log(`\n⭐ [voteForum] REQUEST RECEIVED`);
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const forumId = req.params.id;
      const voteTypeNum = Number(req.body?.voteType);

      console.log(
        `⭐ [voteForum] userId=${userId}, forumId=${forumId}, voteType=${voteTypeNum}`,
      );

      if (voteTypeNum !== 1 && voteTypeNum !== -1) {
        return res.status(400).json({ error: "voteType must be 1 or -1" });
      }

      console.log(`⭐ [voteForum] Calling VotesModel.setVote()`);
      const { data: voteRow, error } = await VotesModel.setVote(
        userId,
        "forum",
        forumId,
        voteTypeNum,
      );
      console.log(
        `⭐ [voteForum] VotesModel.setVote() returned: error=${error}`,
      );

      if (error) throw error;

      // Invalidate cache
      await supabase
        .from("forums")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", forumId);

      const { data: forum, error: fErr } = await ForumModel.findById(forumId);
      if (fErr) throw fErr;

      // Log activity
      const actionType = voteTypeNum === 1 ? "upvote" : "downvote";
      ActivityService.logActivityAsync(userId, forumId, actionType, {
        title: forum.title,
        tags: forum.tags || [],
        subject: forum.subject,
      }).catch((err) => console.error("Failed to log vote:", err));

      // Notification
      if (forum && forum.user_id !== userId) {
        const voter = await UserModel.findById(userId);
        const voterName = voter?.name || "someone";
        const voteText = voteTypeNum === 1 ? "upvoted" : "downvoted";
        const message = `${voterName} ${voteText} your forum "${forum.title.substring(0, 50)}"`;
        await NotificationService.createNotification({
          userId: forum.user_id,
          type: voteTypeNum === 1 ? "upvote" : "downvote",
          referenceId: forumId,
          message,
          metadata: {
            forumTitle: forum.title,
            voterName,
            forumId,
          },
        });
      }

      res.json({
        voteType: voteRow.vote_type,
        voteCount: {
          upvotes: forum.upvotes_count,
          downvotes: forum.downvotes_count,
        },
      });

      // Emit socket event to update all connected clients
      try {
        const io = getIO();
        io.emit("forum_voted", {
          forumId,
          userId,
          voteType: voteRow.vote_type,
          upvotes: forum.upvotes_count,
          downvotes: forum.downvotes_count,
        });
      } catch (err) {
        console.error("Failed to emit socket event:", err);
      }
    } catch (err) {
      console.error("Vote Forum Error:", err);
      res.status(500).json({ error: "Failed to vote forum" });
    }
  },

  // DELETE /api/forums/:id/vote
  async unvoteForum(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const forumId = req.params.id;

      const { error } = await VotesModel.removeVote(userId, "forum", forumId);
      if (error) throw error;

      await supabase
        .from("forums")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", forumId);

      const { data: forum, error: fErr } = await ForumModel.findById(forumId);
      if (fErr) throw fErr;

      res.json({
        voteType: null,
        voteCount: {
          upvotes: forum.upvotes_count,
          downvotes: forum.downvotes_count,
        },
      });

      // Emit socket event to update all connected clients
      try {
        const io = getIO();
        io.emit("forum_voted", {
          forumId,
          userId,
          voteType: null,
          upvotes: forum.upvotes_count,
          downvotes: forum.downvotes_count,
        });
      } catch (err) {
        console.error("Failed to emit socket event:", err);
      }
    } catch (err) {
      console.error("Unvote Forum Error:", err);
      res.status(500).json({ error: "Failed to unvote forum" });
    }
  },

  // GET /api/forums/:id/my-vote
  async getMyVote(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const forumId = req.params.id;
      const { data, error } = await VotesModel.getUserVote(
        userId,
        "forum",
        forumId,
      );
      if (error) throw error;

      res.json({ voteType: data?.vote_type ?? null });
    } catch (err) {
      console.error("Get My Vote Error:", err);
      res.status(500).json({ error: "Failed to fetch vote state" });
    }
  },

  async getTrendingAcademicForums(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 3;
      const forums = await ForumModel.getTrendingAcademicForums(limit);
      res.json({ forums });
    } catch (err) {
      console.error("Error fetching trending academic forums:", err);
      res.status(500).json({ error: "Failed to fetch trending discussions" });
    }
  },
};
