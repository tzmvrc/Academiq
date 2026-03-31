import { supabase } from "../database/supabase.js";

const GLOBAL_MESSAGES_TABLE = "global_messages";
const DM_CONVERSATIONS_TABLE = "dm_conversations";
const DM_MESSAGES_TABLE = "dm_messages";
const REACTIONS_TABLE = "message_reactions";

export const ChatModel = {
  // ---------- Global Messages ----------
  async getGlobalMessages(limit = 50) {
    const { data: messages, error } = await supabase
      .from(GLOBAL_MESSAGES_TABLE)
      .select(
        `
        id,
        content,
        created_at,
        users:user_id (id, name, profile_url)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    if (!messages.length) return [];

    const messageIds = messages.map((m) => m.id);
    const reactionsByMsg = await this.getReactionsForMessages(
      messageIds,
      "global",
    );

    // Reverse to ascending order and attach reactions
    return messages.reverse().map((msg) => ({
      id: msg.id,
      content: msg.content,
      created_at: msg.created_at,
      users: msg.users,
      reactions: reactionsByMsg[msg.id] || [],
    }));
  },

  async createGlobalMessage(userId, content) {
    const { data, error } = await supabase
      .from(GLOBAL_MESSAGES_TABLE)
      .insert([{ user_id: userId, content }])
      .select(
        `
        id,
        content,
        created_at,
        users:user_id (id, name, profile_url)
      `,
      )
      .single();
    if (error) throw error;
    return data;
  },

  // ---------- DM Conversations ----------
  async getConversationsForUser(userId) {
    const { data, error } = await supabase.rpc("get_user_conversations", {
      user_id: userId,
    });
    if (error) throw error;
    return data;
  },

  async getOrCreateConversation(userId1, userId2) {
    const [small, big] =
      userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
    const { data: existing, error: findErr } = await supabase
      .from(DM_CONVERSATIONS_TABLE)
      .select("id")
      .eq("user1_id", small)
      .eq("user2_id", big)
      .maybeSingle();
    if (findErr && findErr.code !== "PGRST116") throw findErr;
    if (existing) return existing.id;

    const { data: newConv, error: createErr } = await supabase
      .from(DM_CONVERSATIONS_TABLE)
      .insert([{ user1_id: small, user2_id: big }])
      .select("id")
      .single();
    if (createErr) throw createErr;
    return newConv.id;
  },

  // ---------- DM Messages ----------
  async getMessagesForConversation(conversationId) {
    const { data: messages, error } = await supabase
      .from(DM_MESSAGES_TABLE)
      .select(
        `
        id,
        content,
        created_at,
        sender:sender_id (id, name, profile_url)
      `,
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (error) throw error;

    if (!messages.length) return [];

    const messageIds = messages.map((m) => m.id);
    const reactionsByMsg = await this.getReactionsForMessages(messageIds, "dm");

    return messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      created_at: msg.created_at,
      sender: msg.sender,
      reactions: reactionsByMsg[msg.id] || [],
    }));
  },

  async createDmMessage(conversationId, senderId, content) {
    const { data, error } = await supabase
      .from(DM_MESSAGES_TABLE)
      .insert([
        { conversation_id: conversationId, sender_id: senderId, content },
      ])
      .select(
        `
        id,
        content,
        created_at,
        conversation_id,
        sender:sender_id (id, name, profile_url)
      `,
      )
      .single();
    if (error) throw error;
    return data;
  },

  // ---------- Message Reactions ----------
  async addReaction(messageId, messageType, userId, reaction) {
    const { data, error } = await supabase
      .from(REACTIONS_TABLE)
      .upsert(
        {
          message_id: messageId,
          message_type: messageType,
          user_id: userId,
          reaction: reaction,
        },
        { onConflict: "message_id, message_type, user_id, reaction" },
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async removeReaction(messageId, messageType, userId, reaction) {
    const { error } = await supabase
      .from(REACTIONS_TABLE)
      .delete()
      .eq("message_id", messageId)
      .eq("message_type", messageType)
      .eq("user_id", userId)
      .eq("reaction", reaction);
    if (error) throw error;
  },

  // Helper: fetch reactions for multiple messages with user names
  async getReactionsForMessages(messageIds, messageType) {
    if (!messageIds.length) return {};

    const { data, error } = await supabase
      .from(REACTIONS_TABLE)
      .select(
        `
        message_id,
        reaction,
        user_id,
        users:user_id (name)
      `,
      )
      .in("message_id", messageIds)
      .eq("message_type", messageType);
    if (error) throw error;

    const grouped = {};
    (data || []).forEach((row) => {
      if (!grouped[row.message_id]) grouped[row.message_id] = [];
      grouped[row.message_id].push({
        userId: row.user_id,
        reaction: row.reaction,
        userName: row.users?.name || "Unknown",
      });
    });
    return grouped;
  },

  // ---------- Clear Global Messages (midnight reset) ----------
  // ---------- Clear Global Messages (midnight reset) ----------
  async clearGlobalMessages() {
    // Delete all rows from global_messages table
    const { error } = await supabase
      .from(GLOBAL_MESSAGES_TABLE)
      .delete()
      .not("id", "is", null); // matches all rows because id is never null
    if (error) throw error;
  },
};
