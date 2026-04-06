import express from "express";
import multer from "multer";
import { ForumsController } from "../services/forum/forum_controller.js";
import { ForumSavesController } from "../services/forum/forumSaves_controller.js";
import { CommentsController } from "../services/comment/comment_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";
import { OnboardingController } from "../services/forum/Onboarding_controller.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// Onboarding: subjects (replaces topics)
router.get("/subjects", authMiddleware, OnboardingController.getSubjects);
router.get("/my-subjects", authMiddleware, OnboardingController.getMySubjects);
router.post("/my-subjects", authMiddleware, OnboardingController.saveSubjects);

// routes/forum_router.js
router.get("/trending-academic", ForumsController.getTrendingAcademicForums);

/* -----------------------
   Forums (Public)
------------------------ */
router.get("/", ForumsController.getAllForums);
router.get("/user", ForumsController.getUserForums); // NEW: get forums by user ID
router.get("/comments", ForumsController.getUserComments); // NEW: get comments by user ID

/* -----------------------
   Forums (Protected)
------------------------ */
router.get("/users/me", authMiddleware, ForumsController.getMyForums);
router.get("/saved/list", authMiddleware, ForumSavesController.getSavedForums);
router.get("/saved", authMiddleware, ForumSavesController.getSavedForums); // NEW: alias for saved forums
router.get("/:id/my-vote", authMiddleware, ForumsController.getMyVote);
router.get("/:id/save", authMiddleware, ForumSavesController.getSaveStatus);

/* -----------------------
   Forums (Public by ID)
------------------------ */
router.get("/:id", ForumsController.getForumById);

/* -----------------------
   Forums (Protected actions)
------------------------ */
router.post(
  "/",
  authMiddleware,
  upload.single("attachment"),
  ForumsController.createForum,
);

router.put(
  "/:id",
  authMiddleware,
  upload.single("attachment"),
  ForumsController.updateForum,
);

router.delete("/:id", authMiddleware, ForumsController.deleteForum);

router.post("/:id/vote", authMiddleware, ForumsController.voteForum);
router.delete("/:id/vote", authMiddleware, ForumsController.unvoteForum);

router.post("/:id/save", authMiddleware, ForumSavesController.toggleSave);

/* -----------------------
   Comments
------------------------ */
router.get("/:id/comments", CommentsController.getCommentsByForumId);
router.post("/:id/comments", authMiddleware, CommentsController.createComment);

export default router;
