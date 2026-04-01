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

  async findByName(name) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("name", name)
      .maybeSingle();
    return { data, error };
  },

  async findByIds(ids) {
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .in("id", ids);
    if (error) throw error;
    return data;
  },

  async create(name) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ name }) // no slug
      .select()
      .single();
    return { data, error };
  },
};