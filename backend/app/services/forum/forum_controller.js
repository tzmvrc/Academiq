import { ForumModel } from "../../models/forum_model.js";
import { ForumTopicModel } from "../../models/forumTopics_model.js";
import { PostVoteModel } from "../../models/postVotes_model.js";
import { CommentModel } from "../../models/comment_model.js";

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
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

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
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { topicIds = [], ...forumData } = req.body;

      const payload = {
        ...forumData,
        user_id: userId,
      };

      const { data, error } = await ForumModel.create(payload);
      if (error) throw error;

      // Attach tags
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

  // POST /api/forums/:id/vote
  async voteForum(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { error } = await PostVoteModel.vote(id, userId);
      if (error) throw error;

      res.json({ message: "Forum voted" });
    } catch (err) {
      console.error("Vote Forum Error:", err);
      res.status(500).json({ error: "Failed to vote forum" });
    }
  },

  // DELETE /api/forums/:id/vote
  async unvoteForum(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { error } = await PostVoteModel.unvote(id, userId);
      if (error) throw error;

      res.json({ message: "Vote removed" });
    } catch (err) {
      console.error("Unvote Forum Error:", err);
      res.status(500).json({ error: "Failed to remove vote" });
    }
  }
};