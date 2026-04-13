import express from "express";
import { authMiddleware } from "../middlewares/auth_middleware.js";
import { AdminController } from "../services/admin/admin_controller.js";

const router = express.Router();

// Admin role middleware
const adminMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "User not authenticated" });
  }

  if (req.user.role !== "admin" && req.user.role !== "moderator") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin role required." });
  }
  next();
};

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// Dashboard stats
router.get("/stats", AdminController.getStats);

// User management
router.get("/users", AdminController.getUsers);
router.get("/users/:id", AdminController.getUser);
router.get("/users/:id/activities", AdminController.getUserActivities);
router.patch("/users/:id", AdminController.updateUser);
router.patch("/users/:id/role", AdminController.setUserRole);
router.delete("/users/:id", AdminController.deleteUser);

// Forum management
router.get("/forums", AdminController.getForums);
router.get("/forums/:id", AdminController.getForum);
router.patch("/forums/:id", AdminController.updateForum);
router.delete("/forums/:id", AdminController.deleteForum);

// Comment management
router.patch("/comments/:id", AdminController.updateComment);
router.delete("/comments/:id", AdminController.deleteComment);

export default router;
