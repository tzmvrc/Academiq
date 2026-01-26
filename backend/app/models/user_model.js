import { supabase } from "../database/supabase.js";

const TABLE = "users";

export const UserModel = {
  // Create new user
  async create({ email, password = null, google_id = null, name, profile_url = null, school = null }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ email, password, google_id, name, profile_url, school }])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Find user by email (manual login)
  async findByEmail(email) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("email", email)
      .single();

    if (error) return null;
    return data;
  },

  // Find user by Google ID
  async findByGoogleId(google_id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("google_id", google_id)
      .single();

    if (error) return null;
    return data;
  },

  // Update last login timestamp
  async updateLastLogin(userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ last_login: new Date() })
      .eq("id", userId)
      .select();

    if (error) throw error;
    return data[0];
  },

  async findById(id) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return null;
  return data;
}

};
