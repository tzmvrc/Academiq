import { ForumModel } from "../../models/forum_model.js";
import { NotificationService } from "./../notification/notification_service.js";

export const AISummaryService = {
  async generateAndNotify(forumId) {
    // Step 1: Generate AI summary (call your AI logic)
    const aiSummary = "AI-generated summary based on comments...";
    
    // Step 2: Update forum with ai_summary
    const { data: forum, error } = await ForumModel.update(forumId, { ai_summary: aiSummary });
    if (error) throw error;
    
    // Step 3: Notify forum author
    await NotificationService.createNotification({
      userId: forum.user_id,
      type: "ai_summary",
      referenceId: forumId,
      message: `AI summary generated for your forum "${forum.title.substring(0, 50)}"`,
      metadata: { forumTitle: forum.title, forumId },
    });
    
    return forum;
  },
};