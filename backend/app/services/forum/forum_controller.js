import path from "path";
import { ForumModel } from "../../models/forum_model.js";
import { ForumTopicModel } from "../../models/forumTopics_model.js";
import { SubjectModel } from "../../models/subject_model.js";
import { VotesModel } from "../../models/votes_model.js";
import { supabase } from "../../database/supabase.js";

const POST_DOCUMENT_BUCKET = "post_document";

const slugifyFileName = (name = "file") => {
  return name
    .replace(/\.[^/.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const uploadForumAttachment = async (file, userId) => {
  if (!file) return null;

  const ext = path.extname(file.originalname || "").toLowerCase();
  const baseName = slugifyFileName(file.originalname || "attachment");
  const filePath = `forums/${userId}/${Date.now()}-${baseName}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(POST_DOCUMENT_BUCKET)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage
    .from(POST_DOCUMENT_BUCKET)
    .getPublicUrl(filePath);

  return publicUrlData?.publicUrl || null;
};

export const ForumsController = {
  // GET /api/forums
  async getAllForums(req, res) {
    try {
      const { data, error } = await ForumModel.findAll();
      if (error) throw error;

      res.json({ forums: data });
    } catch (err) {
      console.error("Get Forums Error:", err);
      res.status(500).json({ error: "Failed to fetch forums" });
    }
  },

  // GET /api/forums/:id
  async getForumById(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await ForumModel.findById(id);
      if (error) throw error;

      res.json({ forum: data });
    } catch (err) {
      console.error("Get Forum Error:", err);
      res.status(404).json({ error: "Forum not found" });
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

    let {
      topicIds = [],
      subject,
      subject_id,
      document_url,
      fileName,
      ...forumData
    } = req.body;

    if (typeof topicIds === "string") {
      try {
        topicIds = JSON.parse(topicIds);
      } catch {
        topicIds = [];
      }
    }

    let finalSubjectId = subject_id;

    if (subject && !subject_id) {
      const { data: foundSubject } = await SubjectModel.findByName(subject);

      if (foundSubject) {
        finalSubjectId = foundSubject.id;
      } else {
        const { data: newSubject, error: createErr } = await supabase
          .from("subjects")
          .insert({
            name: subject,
            slug: subject.toLowerCase().replace(/\s+/g, "-"),
          })
          .select()
          .single();

        if (createErr) throw createErr;
        finalSubjectId = newSubject.id;
      }
    }

    const uploadedDocumentUrl = await uploadForumAttachment(req.file, userId);

    const payload = {
      ...forumData,
      user_id: userId,
      subject_id: finalSubjectId,
      document_url: uploadedDocumentUrl,
    };

    const { data, error } = await ForumModel.create(payload);
    if (error) throw error;

    if (Array.isArray(topicIds) && topicIds.length > 0) {
      for (const topicId of topicIds) {
        await ForumTopicModel.attachTopic(data.id, topicId);
      }
    }

    return res.status(201).json({ forum: data });
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

    let {
      topicIds,
      subject,
      subject_id,
      category,
      document_url,
      fileName,
      ...updates
    } = req.body;

    let finalSubjectId = subject_id || existingForum.subject_id;
    const subjectName = subject || category;

    if (subjectName && !subject_id) {
      const { data: foundSubject } = await SubjectModel.findByName(subjectName);

      if (foundSubject) {
        finalSubjectId = foundSubject.id;
      } else {
        const { data: newSubject, error: createErr } = await supabase
          .from("subjects")
          .insert({
            name: subjectName,
            slug: subjectName.toLowerCase().replace(/\s+/g, "-"),
          })
          .select()
          .single();

        if (createErr) throw createErr;
        finalSubjectId = newSubject.id;
      }
    }

    const updatePayload = {
      ...updates,
      subject_id: finalSubjectId,
    };

    if (req.file) {
      updatePayload.document_url = await uploadForumAttachment(req.file, userId);
    }

    const { data, error } = await ForumModel.update(id, updatePayload);
    if (error) throw error;

    return res.json({ forum: data });
  } catch (err) {
    console.error("Update Forum Error:", err);
    return res.status(500).json({ error: "Failed to update forum" });
  }
},

  // DELETE /api/forums/:id
  async deleteForum(req, res) {
    try {
      const { id } = req.params;

      const { error } = await ForumModel.delete(id);
      if (error) throw error;

      res.json({ message: "Forum deleted successfully" });
    } catch (err) {
      console.error("Delete Forum Error:", err);
      res.status(500).json({ error: "Failed to delete forum" });
    }
  },

  // POST /api/forums/:id/vote
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

      const { data: forum, error: fErr } = await ForumModel.findById(forumId);
      if (fErr) throw fErr;

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
};