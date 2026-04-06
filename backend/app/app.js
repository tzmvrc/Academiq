// app/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import postRoutes from "./routes/test_router.js";
import authrouter from "./routes/auth_router.js";
import tagrouter from "./routes/tag_router.js";
import commentRouter from "./routes/comment_router.js";
import subjectRouter from "./routes/subject_router.js";
import forumRouter from "./routes/forum_router.js";
import peersRouter from "./routes/peers_router.js";
import openrouter from "./routes/open_router.js";
import profileRouter from "./routes/profile_router.js";
import leaderboardRouter from "./routes/leaderboard_router.js";
import notificationRouter from "./routes/notification_router.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Register routes
app.use("/api/test", postRoutes);
app.use("/api/auth", authrouter);
app.use("/api/comments", commentRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/subjects", subjectRouter);
app.use("/api/forums", forumRouter);
app.use("/api/open", openrouter);
app.use("/api/tags", tagrouter);
app.use("/api/peers", peersRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/profile", profileRouter);

app.get("/", (req, res) => {
  res.send("Academiq Backend is running!");
});

export default app; // ✅ no app.listen() here
