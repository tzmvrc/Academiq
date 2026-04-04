import { NotificationModel } from "../../models/notification_model.js";
import { getIO } from "../../middlewares/socket.js";

export const NotificationService = {
  async createNotification({ userId, type, referenceId, message, metadata = null }) {
    try {
      const notification = await NotificationModel.create({
        user_id: userId,
        type,
        reference_id: referenceId,
        message,
        metadata,
      });

      // Emit real‑time event to the user's room
      const io = getIO();
      io.to(`user:${userId}`).emit("notification:new", notification);

      return notification;
    } catch (err) {
      console.error("Failed to create notification:", err);
      return null;
    }
  },
};