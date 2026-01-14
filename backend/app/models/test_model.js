import { supabase } from "../database/supabase.js";

export const PostModel = {
  async create(content) {
    const { data, error } = await supabase
      .from("posts")
      .insert([{ content }])
      .select();

    if (error) throw error;
    return data[0];
  },

  async getAll() {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }
};
