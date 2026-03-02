import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import postRoutes from "./routes/test_router.js";
import authrouter from "./routes/auth_router.js";
import topicRouter from "./routes/topic_router.js";
import commentRouter from "./routes/comment_router.js";
import subjectRouter from "./routes/subject_router.js";
import forumRouter from "./routes/forum_router.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Register routes
app.use("/api/test", postRoutes);
app.use("/api/auth", authrouter);
app.use("/api/topics", topicRouter);
app.use("/api/comments", commentRouter);
app.use("/api/subjects", subjectRouter);
app.use("/api/forums", forumRouter);

app.get("/", (req, res) => {
  res.send("Academiq Backend is running!");
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

export default app;
