import { supabase } from "../database/supabase.js";

const TABLE = "subjects";

export const SubjectModel = {
  async findAll() {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("name", { ascending: true });

    return { data, error };
  },

  async getByTopic(topicId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("topic_id", topicId);

    if (error) throw error;
    return data;
  },

  async findByNameAndTopic(name, topicId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("name", name)
      .eq("topic_id", topicId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async findByName(name) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("name", name)
      .maybeSingle();

    return { data, error };
  },

  async createSimple(name) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ name })
      .select()
      .single();

    return { data, error };
  },

  async create({ name, slug, topicId, userId }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([
        {
          name,
          slug,
          topic_id: topicId,
          created_by: userId,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
