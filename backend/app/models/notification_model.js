import { supabase } from "../database/supabase.js";

const TABLE = "notifications";

export const NotificationModel = {
  async create(notification) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(notification)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async findByUserId(userId, limit = 10, offset = 0) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  },

  async countUnread(userId) {
    const { count, error } = await supabase
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) throw error;
    return count;
  },

  async markAsRead(notificationId, userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markAllAsRead(userId) {
    const { error } = await supabase
      .from(TABLE)
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) throw error;
    return true;
  },
};