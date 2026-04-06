import { UserModel } from "../../models/user_model.js";
import { NotificationService } from "./../notification/notification_service.js";

export const PointsService = {
  async awardPoints(userId, points, reason) {
    // Update user's points
    const user = await UserModel.findById(userId);
    const newPoints = (user.points || 0) + points;
    await UserModel.updatePoints(userId, newPoints);
    
    // Create notification
    await NotificationService.createNotification({
      userId,
      type: "points",
      referenceId: null, // could be forum/comment ID
      message: `You earned ${points} points for ${reason}!`,
      metadata: { points, reason },
    });
    
    return { success: true, newPoints };
  },
};