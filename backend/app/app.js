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
import achievementRouter from "./routes/achievements_router.js";

dotenv.config();
const app = express();

// CORS configuration
const allowedOrigins = [
  'https://academiqme.vercel.app',
  'http://16.176.23.175:8080',  // Vite default dev port
  'http://localhost:8080'   // Alternative dev port
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,   // If your frontend sends cookies or Authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Register routes
app.use("/api/test", postRoutes);
app.use("/api/achievements", achievementRouter);
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

export default app;