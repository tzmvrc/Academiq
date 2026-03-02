import { ForumModel } from "../../models/forum_model.js";
import { ForumTopicModel } from "../../models/forumTopics_model.js";
import { SubjectModel } from "../../models/subject_model.js";
import { PostVoteModel } from "../../models/postVotes_model.js";
import { supabase } from "../../database/supabase.js";

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
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { topicIds = [], subject, subject_id, ...forumData } = req.body;

      let finalSubjectId = subject_id;

      // If subject name is provided instead of ID, look it up or create it
      if (subject && !subject_id) {
        const { data: foundSubject, error: subjErr } =
          await SubjectModel.findByName(subject);

        if (subjErr) {
          console.error("Subject lookup error:", subjErr);
        }

        if (foundSubject) {
          finalSubjectId = foundSubject.id;
        } else {
          // Create subject if it doesn't exist using direct Supabase call
          try {
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
          } catch (createErr) {
            console.error("Subject creation error:", createErr);
            return res.status(400).json({
              error: `Failed to process subject: ${subject}`,
            });
          }
        }
      }

      const payload = {
        ...forumData,
        user_id: userId,
        subject_id: finalSubjectId,
      };

      const { data, error } = await ForumModel.create(payload);
      if (error) throw error;

      if (topicIds.length > 0) {
        for (const topicId of topicIds) {
          await ForumTopicModel.attachTopic(data.id, topicId);
        }
      }

      res.status(201).json({ forum: data });
    } catch (err) {
      console.error("Create Forum Error:", err);
      res.status(500).json({ error: "Failed to create forum" });
    }
  },

  // PUT /api/forums/:id
  async updateForum(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await ForumModel.update(id, req.body);
      if (error) throw error;

      res.json({ forum: data });
    } catch (err) {
      console.error("Update Forum Error:", err);
      res.status(500).json({ error: "Failed to update forum" });
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

  // POST /api/forums/:id/vote  body: { voteType: 1 | -1 }
  async voteForum(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const forumId = req.params.id;
      const voteTypeNum = Number(req.body?.voteType);

      if (voteTypeNum !== 1 && voteTypeNum !== -1) {
        return res.status(400).json({ error: "voteType must be 1 or -1" });
      }

      const { data: voteRow, error } = await PostVoteModel.setVote(
        forumId,
        userId,
        voteTypeNum,
      );
      if (error) throw error;

      const { data: forum, error: fErr } = await ForumModel.findById(forumId);
      if (fErr) throw fErr;

      res.json({
        voteType: voteRow.vote_type,
        voteCount: forum.vote_count,
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

      const { error } = await PostVoteModel.removeVote(forumId, userId);
      if (error) throw error;

      const { data: forum, error: fErr } = await ForumModel.findById(forumId);
      if (fErr) throw fErr;

      res.json({
        voteType: null,
        voteCount: forum.vote_count,
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
      const { data, error } = await PostVoteModel.getUserVote(forumId, userId);
      if (error) throw error;

      res.json({ voteType: data?.vote_type ?? null });
    } catch (err) {
      console.error("Get My Vote Error:", err);
      res.status(500).json({ error: "Failed to fetch vote state" });
    }
  },
};
