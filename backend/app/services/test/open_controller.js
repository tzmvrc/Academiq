import { ChatModel } from "../../models/open_model.js";
import { getIO } from "../../middlewares/socket.js";
import { supabase } from "../../database/supabase.js";

export const ChatController = {
  async getGlobalMessages(req, res) {
    try {
      const messages = await ChatModel.getGlobalMessages(50);
      res.json({ messages });
    } catch (err) {
      console.error("Get global messages error:", err);
      res.status(500).json({ error: "Failed to fetch global messages" });
    }
  },

  async createGlobalMessage(req, res) {
    try {
      const userId = req.user.id;
      const { content } = req.body;
      if (!content?.trim()) {
        return res.status(400).json({ error: "Message content required" });
      }

      const message = await ChatModel.createGlobalMessage(
        userId,
        content.trim(),
      );

      const io = getIO();
      io.to("global").emit("global_message", message);

      res.status(201).json({ message });
    } catch (err) {
      console.error("Create global message error:", err);
      res.status(500).json({ error: "Failed to send message" });
    }
  },

  async getConversations(req, res) {
    try {
      const userId = req.user.id;
      const conversations = await ChatModel.getConversationsForUser(userId);
      res.json({ conversations });
    } catch (err) {
      console.error("Get conversations error:", err);
      // Log full error for debugging
      console.error("Full error:", JSON.stringify(err, null, 2));
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  },

  async createConversation(req, res) {
    try {
      const userId = req.user.id;
      const { userId: otherUserId } = req.body;
      if (!otherUserId) {
        return res.status(400).json({ error: "User ID required" });
      }

      const conversationId = await ChatModel.getOrCreateConversation(
        userId,
        otherUserId,
      );
      const conversations = await ChatModel.getConversationsForUser(userId);
      const conversation = conversations.find((c) => c.id === conversationId);
      if (!conversation) {
        return res
          .status(500)
          .json({ error: "Conversation created but not found" });
      }

      res.status(201).json({ conversation });
    } catch (err) {
      console.error("Create conversation error:", err);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  },

  async getDmMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const messages =
        await ChatModel.getMessagesForConversation(conversationId);
      res.json({ messages });
    } catch (err) {
      console.error("Get DM messages error:", err);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  },

  async createDmMessage(req, res) {
    try {
      const userId = req.user.id;
      const { conversationId, content, recipientId } = req.body; // accept recipientId
      if (!conversationId || !content?.trim()) {
        return res
          .status(400)
          .json({ error: "Conversation ID and content required" });
      }

      const message = await ChatModel.createDmMessage(
        conversationId,
        userId,
        content.trim(),
      );

      const io = getIO();
      io.to(`dm:${conversationId}`).emit("dm_message", message);
      if (recipientId) {
        io.to(`user:${recipientId}`).emit("dm_message", message);
      }

      res.status(201).json({ message });
    } catch (err) {
      console.error("Create DM message error:", err);
      res.status(500).json({ error: "Failed to send message" });
    }
  },
  async addReaction(req, res) {
    try {
      const userId = req.user.id;
      const { messageId, messageType, reaction } = req.body;
      if (!messageId || !messageType || !reaction) {
        return res.status(400).json({ error: "Missing fields" });
      }

      // Add the reaction
      await ChatModel.addReaction(messageId, messageType, userId, reaction);

      // Determine room for socket emission and get conversationId for DMs
      let room;
      let conversationId = null;
      if (messageType === "global") {
        room = "global";
      } else {
        // For DM, fetch the conversation_id from the message
        const { data, error } = await supabase
          .from("dm_messages")
          .select("conversation_id")
          .eq("id", messageId)
          .single();
        if (error) throw error;
        if (!data) throw new Error("DM message not found");
        conversationId = data.conversation_id;
        room = `dm:${conversationId}`;
      }

      const io = getIO();
      io.to(room).emit("reaction_added", {
        messageId,
        messageType,
        userId,
        reaction,
        userName: req.user.name,
        conversationId, // send this for reaction previews in frontend
      });

      res.status(201).json({ success: true });
    } catch (err) {
      console.error("Add reaction error:", err);
      res.status(500).json({ error: "Failed to add reaction" });
    }
  },

  async removeReaction(req, res) {
    try {
      const userId = req.user.id;
      const { messageId, messageType, reaction } = req.body;
      if (!messageId || !messageType || !reaction) {
        return res.status(400).json({ error: "Missing fields" });
      }

      await ChatModel.removeReaction(messageId, messageType, userId, reaction);

      let room;
      let conversationId = null;
      if (messageType === "global") {
        room = "global";
      } else {
        const { data, error } = await supabase
          .from("dm_messages")
          .select("conversation_id")
          .eq("id", messageId)
          .single();
        if (error) throw error;
        if (!data) throw new Error("DM message not found");
        conversationId = data.conversation_id;
        room = `dm:${conversationId}`;
      }

      const io = getIO();
      io.to(room).emit("reaction_removed", {
        messageId,
        messageType,
        userId,
        reaction,
        conversationId, // also send for cleanup
      });

      res.json({ success: true });
    } catch (err) {
      console.error("Remove reaction error:", err);
      res.status(500).json({ error: "Failed to remove reaction" });
    }
  },
};
