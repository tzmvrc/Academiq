import { supabase } from "../database/supabase.js";

const TABLE = "users";

export const UserModel = {
  // Create new user
  async create({
    email,
    password = null,
    google_id = null,
    name,
    profile_url = null,
    school_id = null,
    bio = null,
    role = "user",
  }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([
        { email, password, google_id, name, profile_url, school_id, bio, role },
      ])
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

  // Find user by ID
  async findById(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
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

  // Link Google account to existing manual user
  async updateGoogleId(userId, googleId) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ google_id: googleId })
      .eq("id", userId)
      .is("google_id", null) // extra safety: only link if not already linked
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update onboarding status
  async updateOnboardingStatus(userId, status) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ onboarding_completed: status })
      .eq("id", userId)
      .select();

    if (error) throw error;
    return data;
  },

  // Update user profile
  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update user points
  async updatePoints(userId, points) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ points })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Deactivate user
  async deactivate(userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ is_active: false })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
