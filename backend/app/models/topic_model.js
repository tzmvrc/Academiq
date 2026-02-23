import { supabase } from "../database/supabase.js";

const TABLE = "topics";

export const TopicModel = {
  // Fetch all topics
  async getAll() {
    const { data, error } = await supabase.from(TABLE).select("*");
    if (error) throw error;
    return data;
  },

  // Fetch topics by array of IDs
  async findByIds(ids) {
    const { data, error } = await supabase.from(TABLE).select("*").in("id", ids);
    if (error) throw error;
    return data;
  },
};
