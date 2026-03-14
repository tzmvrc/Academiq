import { supabase } from "../database/supabase.js";

const TABLE = "comments";

export const CommentModel = {
  // Create comment
  async create(payload) {
    return supabase.from(TABLE).insert(payload).select().single();
  },

  // Find comment by ID
  async findById(id) {
    return supabase
      .from(TABLE)
      .select(
        `
        id, user_id, forum_id, parent_comment_id,
        content,
        is_ai_verified,
        upvotes_count, downvotes_count,
        created_at, updated_at,
        users!comments_user_id_fkey ( id, name, profile_url )
      `,
      )
      .eq("id", id)
      .single();
  },

  // Find comments by forum ID (includes author info)
  async findByForumId(forumId) {
    return supabase
      .from(TABLE)
      .select(
        `
        id, user_id, forum_id, parent_comment_id,
        content,
        is_ai_verified,
        upvotes_count, downvotes_count,
        created_at, updated_at,
        users!comments_user_id_fkey ( id, name, profile_url )
      `,
      )
      .eq("forum_id", forumId)
      .order("created_at", { ascending: true });
  },

  // Find comments by user ID
  async findByUserId(userId) {
    return supabase
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
  },

  // Update comment by ID
  async update(id, updates) {
    return supabase.from(TABLE).update(updates).eq("id", id).select().single();
  },

  // Delete comment by ID
  async delete(id) {
    return supabase.from(TABLE).delete().eq("id", id);
  },
};
