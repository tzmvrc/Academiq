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

const POST_DOCUMENT_BUCKET = "post_document";

import { ActivityService } from "../activity_service.js";

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

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from(POST_DOCUMENT_BUCKET)
    .getPublicUrl(filePath);

  return publicUrlData?.publicUrl || null;
};

// Helper: set tags for a forum and update usage counts
const setForumTags = async (forumId, newTagIds) => {
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

  // Update usage counts
  for (const tagId of added) {
    await TagModel.updateUsageCount(tagId, 1);
  }
  for (const tagId of removed) {
    await TagModel.updateUsageCount(tagId, -1);
  }
};

export const ForumsController = {
  // GET /api/forums
  // inside ForumsController
  // In forum_controller.js
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
      res.json({ forums, hasMore, total: count || 0 });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch forums" });
    }
  },

  // GET /api/forums/:id
  async getForumById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id; // Optional - user might not be logged in

      const { data, error } = await ForumModel.findById(id);
      if (error)
        if (userId && data) {
          /* Line 162 omitted */
        }

      res.json({ forum: data });
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
      const { data, error } = await ForumModel.findByUserId(
        userId,
        parseInt(limit),
        parseInt(offset),
      );
      if (error) throw error;
      res.json({ forums: data });
    } catch (err) {
      console.error("Error fetching user forums:", err);
      res.status(500).json({ error: "Failed to fetch forums" });
    }
  },

  // Get comments by userId (public)
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

  // GET /api/forums/users/me
  async getMyForums(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { data, error } = await ForumModel.findByUserId(userId);
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
      console.log("CREATE BODY:", req.body);
      console.log("CREATE FILE:", req.file);
      console.log("CREATE CONTENT-TYPE:", req.headers["content-type"]);

      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // Fetch user details for watermarking (and embedding)
      const user = await UserModel.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      const userName = user.name || "User";
      const schoolName = user.school || "School";

      // Accept tagIds (instead of topicIds)
      let { tagIds = [], subject, subject_id, title, content } = req.body;

      // Parse tagIds if sent as JSON string
      if (typeof tagIds === "string") {
        try {
          tagIds = JSON.parse(tagIds);
        } catch {
          tagIds = [];
        }
      }

      let finalSubjectId = subject_id;

      // Handle subject creation/retrieval if only subject name provided
      if (subject && !subject_id) {
        const { data: foundSubject } = await SubjectModel.findByName(subject);
        if (foundSubject) {
          finalSubjectId = foundSubject.id;
        } else {
          // Create new subject without slug
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
        userName,
        schoolName,
      );

      const payload = {
        title,
        content,
        user_id: userId,
        subject_id: finalSubjectId,
        document_url: uploadedDocumentUrl || null,
      };

      const { data: forum, error } = await ForumModel.create(payload);
      if (error) throw error;

      // Attach tags and update usage counts
      if (Array.isArray(tagIds) && tagIds.length > 0) {
        await setForumTags(forum.id, tagIds);
      }

      // --- ASYNC: Generate embedding for this forum ---
      setImmediate(async () => {
        try {
          const { generateForumEmbedding } =
            await import("../embedding/embeddingService.js");
          const embedding = await generateForumEmbedding(title, content);
          if (embedding) {
            await supabase
              .from("forums")
              .update({ embedding })
              .eq("id", forum.id);
            console.log(`✅ Embedding stored for forum ${forum.id}`);
          }
        } catch (err) {
          console.error(
            `Failed to generate embedding for forum ${forum.id}:`,
            err,
          );
        }
      });

      return res.status(201).json({ forum });
    } catch (err) {
      console.error("Create Forum Error:", err);
      return res.status(500).json({ error: "Failed to create forum" });
    }
  },

  // PUT /api/forums/:id
  async updateForum(req, res) {
    try {
      console.log("UPDATE BODY:", req.body);
      console.log("UPDATE FILE:", req.file);
      console.log("UPDATE CONTENT-TYPE:", req.headers["content-type"]);

      const { id } = req.params;
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { data: existingForum, error: existingError } =
        await ForumModel.findById(id);
      if (existingError || !existingForum) {
        return res.status(404).json({ error: "Forum not found" });
      }

      let { tagIds, subject, subject_id, title, content } = req.body;

      // Parse tagIds if sent as JSON string
      if (typeof tagIds === "string") {
        try {
          tagIds = JSON.parse(tagIds);
        } catch {
          tagIds = [];
        }
      }

      let finalSubjectId = subject_id || existingForum.subject_id;

      // Handle subject update if a new subject name is provided
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

      const updatePayload = {
        title,
        content,
        subject_id: finalSubjectId,
      };

      if (req.file) {
        const user = await UserModel.findById(userId);
        const userName = user?.name || "User";
        const schoolName = user?.school || "School";
        updatePayload.document_url = await uploadForumAttachment(
          req.file,
          userId,
          userName,
          schoolName,
        );
      }

      const { data: updatedForum, error } = await ForumModel.update(
        id,
        updatePayload,
      );
      if (error) throw error;

      // Update tags if tagIds were provided
      if (tagIds !== undefined) {
        await setForumTags(id, tagIds);
      }

      // --- ASYNC: Regenerate embedding if title or content changed ---
      const titleChanged = title !== existingForum.title;
      const contentChanged = content !== existingForum.content;
      if (titleChanged || contentChanged) {
        setImmediate(async () => {
          try {
            const { generateForumEmbedding } =
              await import("../embedding/embeddingService.js");
            const embedding = await generateForumEmbedding(title, content);
            if (embedding) {
              await supabase.from("forums").update({ embedding }).eq("id", id);
              console.log(`✅ Embedding updated for forum ${id}`);
            }
          } catch (err) {
            console.error(`Failed to update embedding for forum ${id}:`, err);
          }
        });
      }

      return res.json({ forum: updatedForum });
    } catch (err) {
      console.error("Update Forum Error:", err);
      return res.status(500).json({ error: "Failed to update forum" });
    }
  },

  // DELETE /api/forums/:id
  async deleteForum(req, res) {
    try {
      const { id } = req.params;

      // First, get all tags associated with this forum to decrement usage counts
      const { data: tags } = await supabase
        .from("forum_tags")
        .select("tag_id")
        .eq("forum_id", id);
      const tagIds = tags?.map((t) => t.tag_id) || [];

      // Delete forum (this will cascade to forum_tags)
      const { error } = await ForumModel.delete(id);
      if (error) throw error;

      // Decrement usage counts for all tags
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
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const forumId = req.params.id;
      const voteTypeNum = Number(req.body?.voteType);

      if (voteTypeNum !== 1 && voteTypeNum !== -1) {
        return res.status(400).json({ error: "voteType must be 1 or -1" });
      }

      const { data: voteRow, error } = await VotesModel.setVote(
        userId,
        "forum",
        forumId,
        voteTypeNum,
      );
      if (error) throw error;

      // Fetch forum details to get owner and title
      const { data: forum, error: fErr } = await ForumModel.findById(forumId);
      if (fErr) throw fErr;

      // Log voting activity (upvote or downvote)
      const actionType = voteTypeNum === 1 ? "upvote" : "downvote";
      ActivityService.logActivityAsync(userId, forumId, actionType, {
        title: forum.title,
        tags: forum.tags || [],
        subject: forum.subject,
      }).catch((err) => console.error("Failed to log vote:", err));

      // --- Notification: when someone votes on your forum (and not yourself) ---
      if (forum && forum.user_id !== userId) {
        // Fetch voter's name from database
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

      const { data: forum, error: fErr } = await ForumModel.findById(forumId);
      if (fErr) throw fErr;

      res.json({
        voteType: null,
        voteCount: {
          upvotes: forum.upvotes_count,
          downvotes: forum.downvotes_count,
        },
      });
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

  // controllers/forum_controller.js
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
