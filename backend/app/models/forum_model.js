import { supabase } from "../database/supabase.js";

const TABLE = "forums";

export const ForumModel = {
  async create(payload) {
    return supabase.from(TABLE).insert(payload).select().single();
  },

  async findById(id) {
    const { data, error } = await supabase
      .from("forums")
      .select(
        `
      *,
      user:user_id(id, name, profile_url, school),
      subject:subject_id(id, name),
      forum_tags(
        tag:tag_id(id, name, slug, usage_count)
      )
    `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    // Transform tags
    if (data) {
      data.tags = (data.forum_tags || []).map((ft) => ft.tag).filter(Boolean);
      delete data.forum_tags;
    }
    return { data, error: null };
  },

  async findByUserId(userId, limit = 10, offset = 0) {
    const { data, error } = await supabase
      .from("forums")
      .select(
        `
      id,
      title,
      content,
      upvotes_count,
      comments_count,
      created_at,
      subject:subject_id ( id, name )
    `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return { data, error: null };
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
    const { data, error } = await supabase
      .from("forums")
      .select(
        `
      *,
      user:user_id(id, name, profile_url, school),
      subject:subject_id(id, name),
      forum_tags(
        tag:tag_id(id, name, slug, usage_count)
      )
    `,
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    // Transform tags for each forum
    const transformed = data.map((forum) => ({
      ...forum,
      tags: (forum.forum_tags || []).map((ft) => ft.tag).filter(Boolean),
      forum_tags: undefined,
    }));
    return { data: transformed, error: null };
  },

  async update(id, updates) {
    return supabase.from(TABLE).update(updates).eq("id", id).select().single();
  },

  async delete(id) {
    return supabase.from(TABLE).delete().eq("id", id);
  },

  async getTagsForForum(forumId) {
    const { data, error } = await supabase
      .from("forum_tags")
      .select("tag:tag_id(id, name, slug)")
      .eq("forum_id", forumId);
    if (error) throw error;
    return data.map((item) => item.tag);
  },

  async setTags(forumId, tagIds) {
    // Delete existing
    const { error: delError } = await supabase
      .from("forum_tags")
      .delete()
      .eq("forum_id", forumId);
    if (delError) throw delError;

    if (tagIds.length === 0) return [];

    const rows = tagIds.map((tagId) => ({ forum_id: forumId, tag_id: tagId }));
    const { data, error } = await supabase
      .from("forum_tags")
      .insert(rows)
      .select();
    if (error) throw error;
    return data;
  },
};
