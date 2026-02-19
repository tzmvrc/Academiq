import { supabase } from "../database/supabase.js";

const TABLE = "responses";

export const ResponseModel = {
  // Create response
  async create(payload) {
    return supabase.from(TABLE).insert(payload).select().single();
  },

  // Find response by ID
  async findById(id) {
    return supabase.from(TABLE).select("*").eq("id", id).single();
  },

  // Find all responses
  async findAll() {
    return supabase.from(TABLE).select("*").order("created_at", { ascending: false });
  },

  // Find responses by forum ID
  async findByForumId(forumId) {
    return supabase
      .from(TABLE)
      .select("*")
      .eq("forum_id", forumId)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });
  },

  // Find responses by user ID
  async findByUserId(userId) {
    return supabase
      .from(TABLE)
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });
  },

  // Update response by ID
  async update(id, updates) {
    return supabase.from(TABLE).update(updates).eq("id", id).select().single();
  },

  // Delete response by ID
  async delete(id) {
    return supabase.from(TABLE).delete().eq("id", id);
  },

  // Increment likes count
  async incrementLikes(id) {
    return supabase.rpc("increment_response_likes", { response_id: id });
  },

  // Decrement likes count
  async decrementLikes(id) {
    return supabase.rpc("decrement_response_likes", { response_id: id });
  },

  // Increment dislikes count
  async incrementDislikes(id) {
    return supabase.rpc("increment_response_dislikes", { response_id: id });
  },

  // Decrement dislikes count
  async decrementDislikes(id) {
    return supabase.rpc("decrement_response_dislikes", { response_id: id });
  },

  // Archive response
  async archive(id) {
    return supabase
      .from(TABLE)
      .update({ is_archived: true })
      .eq("id", id)
      .select()
      .single();
  },

 // Unarchive response
  async unarchive(id) {
    return supabase
      .from(TABLE)
      .update({ is_archived: false })
      .eq("id", id)
      .select()
      .single();
  },
};