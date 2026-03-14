import { supabase } from "../database/supabase.js";

const TABLE = "topics";

export const TopicModel = {
  // Fetch all topics
  async getAll() {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data;
  },

  // Fetch topics by array of IDs
  async findByIds(ids) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .in("id", ids);
    if (error) throw error;
    return data;
  },

  // Find topic by slug
  async findBySlug(slug) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("slug", slug)
      .single();
    if (error) return null;
    return data;
  },

  // Create topic
  async create({ name, slug, category, icon = null, color = null }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ name, slug, category, icon, color }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
