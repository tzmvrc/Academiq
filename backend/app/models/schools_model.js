import { supabase } from "../database/supabase.js";

const TABLE = "schools";

export const SchoolModel = {
  // Create a new school
  async create({ school_name, email_domain }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ school_name, email_domain }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Find school by ID
  async findById(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  // Find school by email domain
  async findByEmailDomain(email_domain) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("email_domain", email_domain)
      .maybeSingle();

    if (error) return null;
    return data;
  },

  // Get all schools
  async findAll() {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("school_name", { ascending: true });

    return { data, error };
  },

  // Update school points
  async updatePoints(id, points) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ points })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update school info
  async update(id, updates) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete school
  async delete(id) {
    const { error } = await supabase.from(TABLE).delete().eq("id", id);

    if (error) throw error;
  },
};
