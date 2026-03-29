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
    school = null,
    bio = null,
    role = "user",
    onboarding_completed = false,
  }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([
        {
          email,
          password,
          google_id,
          name,
          profile_url,
          school_id,
          school,
          bio,
          role,
          onboarding_completed,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findByEmail(email) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("email", email)
      .single();

    if (error) return null;
    return data;
  },

  async findByGoogleId(google_id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("google_id", google_id)
      .single();

    if (error) return null;
    return data;
  },

  async findById(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  async updateLastLogin(userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ last_login: new Date() })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateGoogleId(userId, googleId) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ google_id: googleId })
      .eq("id", userId)
      .is("google_id", null)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateOnboardingStatus(userId, status) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ onboarding_completed: status })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

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
