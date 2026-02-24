import { ResponseModel } from "../../models/response_model.js";

export const ResponsesController = {
  // GET /api/responses
  async getAllResponses(req, res) {
    try {
      const { data, error } = await ResponseModel.findAll();
      if (error) throw error;

      res.json({ responses: data });
    } catch (err) {
      console.error("Get Responses Error:", err);
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  },

  // GET /api/responses/:id
  async getResponseById(req, res) {
    try {
      const { id } = req.params;
      const { data, error } = await ResponseModel.findById(id);
      if (error) throw error;

      res.json({ response: data });
    } catch (err) {
      console.error("Get Response Error:", err);
      res.status(404).json({ error: "Response not found" });
    }
  },

  // GET /api/responses/forum/:forumId
  async getResponsesByForumId(req, res) {
    try {
      const { forumId } = req.params;
      const { data, error } = await ResponseModel.findByForumId(forumId);
      if (error) throw error;

      res.json({ responses: data });
    } catch (err) {
      console.error("Get Forum Responses Error:", err);
      res.status(500).json({ error: "Failed to fetch forum responses" });
    }
  },

  // GET /api/responses/users/me
  async getMyResponses(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { data, error } = await ResponseModel.findByUserId(userId);
      if (error) throw error;

      res.json({ responses: data });
    } catch (err) {
      console.error("Get My Responses Error:", err);
      res.status(500).json({ error: "Failed to fetch user responses" });
    }
  },

  // POST /api/responses
  async createResponse(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const payload = {
        ...req.body,
        created_by: userId,
      };

      const { data, error } = await ResponseModel.create(payload);
      if (error) throw error;

      res.status(201).json({ response: data });
    } catch (err) {
      console.error("Create Response Error:", err);
      res.status(500).json({ error: "Failed to create response" });
    }
  },

  // PUT /api/responses/:id
  async updateResponse(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await ResponseModel.update(id, req.body);
      if (error) throw error;

      res.json({ response: data });
    } catch (err) {
      console.error("Update Response Error:", err);
      res.status(500).json({ error: "Failed to update response" });
    }
  },

  // DELETE /api/responses/:id
  async deleteResponse(req, res) {
    try {
      const { id } = req.params;
      const { error } = await ResponseModel.delete(id);
      if (error) throw error;

      res.json({ message: "Response deleted successfully" });
    } catch (err) {
      console.error("Delete Response Error:", err);
      res.status(500).json({ error: "Failed to delete response" });
    }
  },

  // POST /api/responses/:id/like
  async likeResponse(req, res) {
    try {
      const { id } = req.params;
      const { error } = await ResponseModel.incrementLikes(id);
      if (error) throw error;

      res.json({ message: "Response liked" });
    } catch (err) {
      console.error("Like Response Error:", err);
      res.status(500).json({ error: "Failed to like response" });
    }
  },

  // POST /api/responses/:id/unlike
  async unlikeResponse(req, res) {
    try {
      const { id } = req.params;
      const { error } = await ResponseModel.decrementLikes(id);
      if (error) throw error;

      res.json({ message: "Like removed" });
    } catch (err) {
      console.error("Unlike Response Error:", err);
      res.status(500).json({ error: "Failed to unlike response" });
    }
  },

  // POST /api/responses/:id/dislike
  async dislikeResponse(req, res) {
    try {
      const { id } = req.params;
      const { error } = await ResponseModel.incrementDislikes(id);
      if (error) throw error;

      res.json({ message: "Response disliked" });
    } catch (err) {
      console.error("Dislike Response Error:", err);
      res.status(500).json({ error: "Failed to dislike response" });
    }
  },

  // POST /api/responses/:id/undislike
  async undislikeResponse(req, res) {
    try {
      const { id } = req.params;
      const { error } = await ResponseModel.decrementDislikes(id);
      if (error) throw error;

      res.json({ message: "Dislike removed" });
    } catch (err) {
      console.error("Undislike Response Error:", err);
      res.status(500).json({ error: "Failed to remove dislike" });
    }
  },

  // PATCH /api/responses/:id/archive
  async archiveResponse(req, res) {
    try {
      const { id } = req.params;
      const { data, error } = await ResponseModel.archive(id);
      if (error) throw error;

      res.json({ response: data });
    } catch (err) {
      console.error("Archive Response Error:", err);
      res.status(500).json({ error: "Failed to archive response" });
    }
  },

  // PATCH /api/responses/:id/unarchive
  async unarchiveResponse(req, res) {
    try {
      const { id } = req.params;
      const { data, error } = await ResponseModel.unarchive(id);
      if (error) throw error;

      res.json({ response: data });
    } catch (err) {
      console.error("Unarchive Response Error:", err);
      res.status(500).json({ error: "Failed to unarchive response" });
    }
  },
};