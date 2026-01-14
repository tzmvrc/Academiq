import { Router } from "express";
import { createPost, getAllPosts } from "../services/test/test_controller.js";

const router = Router();

router.post("/post", createPost);  // POST /api/posts
router.get("/", getAllPosts);  // GET /api/posts

export default router;
