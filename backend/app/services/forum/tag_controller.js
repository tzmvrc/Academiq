import { TagModel } from "../../models/tag_model.js";

export const TagController = {
  // GET /api/tags
  async getAllTags(req, res) {
    try {
      const { sort } = req.query; // 'popular' or any other
      const { data, error } = await TagModel.findAll(sort === "popular" ? "popular" : "name");
      if (error) throw error;
      res.json({ tags: data });
    } catch (err) {
      console.error("Get tags error:", err);
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  },

  // GET /api/tags/:id
  async getTagById(req, res) {
    try {
      const { id } = req.params;
      const { data, error } = await TagModel.findById(id);
      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Tag not found" });
      res.json({ tag: data });
    } catch (err) {
      console.error("Get tag error:", err);
      res.status(500).json({ error: "Failed to fetch tag" });
    }
  },

  // POST /api/tags (admin only)
  async createTag(req, res) {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Name required" });

      // Check if exists
      const { data: existing } = await TagModel.findByName(name);
      if (existing) return res.status(409).json({ error: "Tag already exists" });

      // Generate slug
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const { data, error } = await TagModel.create(name, slug);
      if (error) throw error;
      res.status(201).json({ tag: data });
    } catch (err) {
      console.error("Create tag error:", err);
      res.status(500).json({ error: "Failed to create tag" });
    }
  },

  // PUT /api/tags/:id (admin only)
  async updateTag(req, res) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Name required" });

      const { data, error } = await TagModel.update(id, { name });
      if (error) throw error;
      if (!data) return res.status(404).json({ error: "Tag not found" });
      res.json({ tag: data });
    } catch (err) {
      console.error("Update tag error:", err);
      res.status(500).json({ error: "Failed to update tag" });
    }
  },

  // DELETE /api/tags/:id (admin only)
  async deleteTag(req, res) {
    try {
      const { id } = req.params;
      const { error } = await TagModel.delete(id);
      if (error) throw error;
      res.json({ message: "Tag deleted" });
    } catch (err) {
      console.error("Delete tag error:", err);
      res.status(500).json({ error: "Failed to delete tag" });
    }
  },
};