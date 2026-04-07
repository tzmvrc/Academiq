import { ForumSavesModel } from "../../models/forumSaves_model.js";
import { ActivityService } from "../activity_service.js";
import { ForumModel } from "../../models/forum_model.js";

export const ForumSavesController = {
  // POST /api/forums/:id/save
  async toggleSave(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const forumId = req.params.id;

      // Check current save status
      const { data: existing, error: checkError } =
        await ForumSavesModel.isSaved(forumId, userId);

      if (checkError) throw checkError;

      let message, saved;

      if (existing) {
        // Already saved, so unsave
        const { error } = await ForumSavesModel.unsave(forumId, userId);
        if (error) throw error;
        message = "Forum unsaved";
        saved = false;
      } else {
        // Not saved, so save
        const { error } = await ForumSavesModel.save(forumId, userId);
        if (error) throw error;
        message = "Forum saved";
        saved = true;

        // Log save activity (only when saving, not unsaving)
        const forum = await ForumModel.findById(forumId);
        ActivityService.logActivityAsync(userId, forumId, "save", {
          title: forum?.title,
          tags: forum?.tags || [],
          subject: forum?.subject,
        }).catch((err) => console.error("Failed to log save:", err));
      }

      res.json({ message, saved });
    } catch (err) {
      console.error("Toggle Save Forum Error:", err);
      res.status(500).json({ error: "Failed to save forum" });
    }
  },

  // GET /api/forums/:id/save (check if saved)
  async getSaveStatus(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const forumId = req.params.id;
      const { data, error } = await ForumSavesModel.isSaved(forumId, userId);

      if (error) throw error;

      res.json({ saved: !!data });
    } catch (err) {
      console.error("Get Save Status Error:", err);
      res.status(500).json({ error: "Failed to fetch save status" });
    }
  },

  // GET /api/forums/saved (get all saved forums for user)
  async getSavedForums(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { data, error } = await ForumSavesModel.findByUserId(userId);
      if (error) throw error;

      // Transform to match frontend expected format: { saved: [...] }
      const saved = (data || []).map((save) => ({
        ...save.forums,
        saved_at: save.created_at,
      }));

      res.json({ saved });
    } catch (err) {
      console.error("Get Saved Forums Error:", err);
      res.status(500).json({ error: "Failed to fetch saved forums" });
    }
  },
};
