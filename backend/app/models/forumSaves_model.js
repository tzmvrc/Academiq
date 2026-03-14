import { supabase } from "../database/supabase.js";

const TABLE = "forum_saves";

export const ForumSavesModel = {
  // Check if forum is saved by user
  async isSaved(forumId, userId) {
    return supabase
      .from(TABLE)
      .select("*")
      .eq("forum_id", forumId)
      .eq("user_id", userId)
      .maybeSingle();
  },

  // Save a forum
  async save(forumId, userId) {
    return supabase
      .from(TABLE)
      .insert({ forum_id: forumId, user_id: userId })
      .select()
      .single();
  },

  // Unsave a forum
  async unsave(forumId, userId) {
    return supabase
      .from(TABLE)
      .delete()
      .eq("forum_id", forumId)
      .eq("user_id", userId);
  },

  // Toggle save (save if not saved, unsave if saved)
  async toggleSave(forumId, userId) {
    const { data: existing, error: checkError } = await this.isSaved(
      forumId,
      userId,
    );

    if (checkError) throw checkError;

    if (existing) {
      // Already saved, remove it
      return this.unsave(forumId, userId);
    } else {
      // Not saved, add it
      return this.save(forumId, userId);
    }
  },

  // Get all saved forums for a user
  async findByUserId(userId) {
    return supabase
      .from(TABLE)
      .select(
        `
        forum_id,
        created_at,
        forums (
          id, user_id, subject_id,
          title, content,
          document_url, is_ai_verified,
          comments_count, upvotes_count, downvotes_count,
          created_at,
          users!forums_user_id_fkey ( id, name, profile_url ),
          subjects ( id, name )
        )
      `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
  },
};
