import cron from "node-cron";
import { getIO } from "../../middlewares/socket.js";
import { ChatModel } from "../../models/open_model.js";

// Schedule at 12:00 AM (00:00) daily
cron.schedule(
  "0 0 * * *",
  async () => {
    console.log("🕛 Running global chat reset...");
    try {
      await ChatModel.clearGlobalMessages();
      const io = getIO();
      io.emit("global_chat_cleared", { timestamp: new Date().toISOString() });
      console.log("✅ Global chat cleared.");
    } catch (err) {
      console.error("❌ Failed to clear global chat:", err);
    }
  },
  {
    timezone: "Asia/Manila",
  },
);
