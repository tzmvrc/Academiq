import { supabase } from "../database/supabase.js";

const TABLE = "forums";

export const ForumModel = {
  async create(payload) {
    return supabase.from(TABLE).insert(payload).select().single();
  },

  async findById(id) {
    return supabase
      .from(TABLE)
      .select(`
        *,
        users ( id, name, profile_url ),
        subjects ( id, name )
      `)
      .eq("id", id)
      .single();
  },

  async findAll() {
    return supabase
      .from(TABLE)
      .select(`
        *,
        users ( id, name, profile_url ),
        subjects ( id, name )
      `)
      .order("created_at", { ascending: false });
  },

  async findByUserId(userId) {
    return supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
  },

  async update(id, updates) {
    return supabase.from(TABLE).update(updates).eq("id", id).select().single();
  },

  async delete(id) {
    return supabase.from(TABLE).delete().eq("id", id);
  }
};