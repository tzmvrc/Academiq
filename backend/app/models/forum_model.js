import { supabase } from "../database/supabase.js";

const TABLE = "forums";

export const ForumModel = {
  async create(payload) {
    return supabase.from(TABLE).insert(payload).select().single();
  },

  async findById(id) {
    return supabase
      .from(TABLE)
      .select(
        `
        id, user_id, subject_id,
        title, content,
        document_url, ai_summary, is_ai_verified,
        comments_count, upvotes_count, downvotes_count,
        created_at, updated_at,
        users!forums_user_id_fkey ( id, name, profile_url ),
        subjects ( id, name )
      `,
      )
      .eq("id", id)
      .single();
  },

  async findAll() {
    return supabase
      .from(TABLE)
      .select(
        `
        id, user_id, subject_id,
        title, content,
        document_url, is_ai_verified, ai_summary,
        comments_count, upvotes_count, downvotes_count,
        created_at,
        users!forums_user_id_fkey ( id, name, profile_url ),
        subjects ( id, name )
      `,
      )
      .order("created_at", { ascending: false });
  },

  async findByUserId(userId) {
    return supabase
      .from(TABLE)
      .select(
        `
        id, user_id, subject_id,
        title, content,
        document_url, is_ai_verified, ai_summary,
        comments_count, upvotes_count, downvotes_count,
        created_at,
        users!forums_user_id_fkey ( id, name, profile_url ),
        subjects ( id, name )
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
  },

  async update(id, updates) {
    return supabase.from(TABLE).update(updates).eq("id", id).select().single();
  },

  async delete(id) {
    return supabase.from(TABLE).delete().eq("id", id);
  },
};
