import { supabase } from "../database/supabase.js";

const TABLE = "tags";

export const TagModel = {
  async findAll(sortBy = "name") {
    let query = supabase.from(TABLE).select("*");
    if (sortBy === "popular") {
      query = query.order("usage_count", { ascending: false });
    } else {
      query = query.order("name", { ascending: true });
    }
    const { data, error } = await query;
    return { data, error };
  },

  async findById(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();
    return { data, error };
  },

  async findByName(name) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("name", name)
      .maybeSingle();
    return { data, error };
  },

  async create(name, slug) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ name, slug, usage_count: 0 })
      .select()
      .single();
    return { data, error };
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    return { data, error };
  },

  async delete(id) {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);
    return { error };
  },

  // Update usage count for a tag (increment or decrement by delta)
  async updateUsageCount(id, delta) {
    const { data, error } = await supabase.rpc("update_tag_usage", {
      tag_id: id,
      delta: delta,
    });
    return { data, error };
  },

  // models/tag_model.js
  async findAllWithCount(limit = 15) {
    // Fetch all tags with their forum_tags count (no ordering in DB)
    const { data, error } = await supabase.from("tags").select(`
      id,
      name,
      forum_tags(count)
    `);
    if (error) throw error;

    // Format and compute discussion_count
    let tagsWithCount = data.map((t) => ({
      id: t.id,
      name: t.name,
      discussion_count: t.forum_tags?.[0]?.count || 0,
    }));

    // Sort by discussion_count descending and apply limit
    tagsWithCount.sort((a, b) => b.discussion_count - a.discussion_count);
    return tagsWithCount.slice(0, limit);
  },
};
