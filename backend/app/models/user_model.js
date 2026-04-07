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

  // In UserModel, add:
  async findAllExcept(userId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("id, name, profile_url, school")
      .neq("id", userId)
      .order("name", { ascending: true });
    if (error) throw error;
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

  async findByName(name) {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .ilike("name", name) // case‑insensitive match
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

  // Add these functions inside the existing UserModel object

  // Get paginated leaderboard (ordered by points DESC)
  // user_model.js (only the changed method)

  async getLeaderboard(limit, offset, school = null) {
    let query = supabase
      .from(TABLE)
      .select("id, name, profile_url, school, points")
      .order("points", { ascending: false, nullsLast: true });

    if (school) {
      query = query.eq("school", school);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    return data.map((user, idx) => ({ ...user, rank: offset + idx + 1 }));
  },

  // Get current user's rank (1-based)
  async getUserRank(userId) {
    const { data: user } = await supabase
      .from(TABLE)
      .select("points")
      .eq("id", userId)
      .single();
    if (!user) return null;

    const { count } = await supabase
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .gt("points", user.points || 0);

    return (count || 0) + 1;
  },

  // Get points of the 100th ranked user (or 0 if less than 100 users)
  async getTop100Threshold() {
    const { data } = await supabase
      .from(TABLE)
      .select("points")
      .order("points", { ascending: false })
      .range(99, 99); // 100th user (0‑based index)

    if (!data || data.length === 0) return 0;
    return data[0].points;
  },

  async incrementFollowingCount(userId, delta = 1) {
    // Fetch current count
    const { data: user, error: fetchError } = await supabase
      .from(TABLE)
      .select("following_count")
      .eq("id", userId)
      .single();
    if (fetchError) throw fetchError;

    const newCount = (user?.following_count || 0) + delta;
    const { error: updateError } = await supabase
      .from(TABLE)
      .update({ following_count: newCount })
      .eq("id", userId);
    if (updateError) throw updateError;
    return newCount;
  },

  // Increment followers count for a user
  async incrementFollowersCount(userId, delta = 1) {
    // Fetch current count
    const { data: user, error: fetchError } = await supabase
      .from(TABLE)
      .select("followers_count")
      .eq("id", userId)
      .single();
    if (fetchError) throw fetchError;

    const newCount = (user?.followers_count || 0) + delta;
    const { error: updateError } = await supabase
      .from(TABLE)
      .update({ followers_count: newCount })
      .eq("id", userId);
    if (updateError) throw updateError;
    return newCount;
  },
};
