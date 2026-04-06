import { NotificationModel } from "../../models/notification_model.js";

export const NotificationController = {
  async getUserNotifications(req, res) {
    try {
      const userId = req.user.id;
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);
      const offset = parseInt(req.query.offset) || 0;
      const notifications = await NotificationModel.findByUserId(userId, limit, offset);
      const unreadCount = await NotificationModel.countUnread(userId);
      res.json({ notifications, unreadCount });
    } catch (err) {
      console.error("Get notifications error:", err);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  },

  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const count = await NotificationModel.countUnread(userId);
      res.json({ count });
    } catch (err) {
      console.error("Get unread count error:", err);
      res.status(500).json({ error: "Failed to get unread count" });
    }
  },

  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const notification = await NotificationModel.markAsRead(id, userId);
      res.json({ notification });
    } catch (err) {
      console.error("Mark as read error:", err);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  },

  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      await NotificationModel.markAllAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (err) {
      console.error("Mark all as read error:", err);
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  },
};