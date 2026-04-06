import express from "express";
import { NotificationController } from "../services/notification/notification_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";

const router = express.Router();

router.get("/", authMiddleware, NotificationController.getUserNotifications);
router.get(
  "/unread-count",
  authMiddleware,
  NotificationController.getUnreadCount,
);
router.patch("/read-all", authMiddleware, NotificationController.markAllAsRead);
router.patch("/:id/read", authMiddleware, NotificationController.markAsRead);

export default router;
