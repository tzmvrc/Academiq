import { PostModel } from "./../../models/test_model.js";

export const createPost = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: "content is required" });
    }

    const post = await PostModel.create(content);
    return res.status(201).json({ message: "Post created", post });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await PostModel.getAll();
    return res.json(posts);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
