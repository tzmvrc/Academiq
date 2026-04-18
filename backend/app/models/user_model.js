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
      .select("id, name, profile_url, school, points, created_at")
      .order("points", { ascending: false, nullsLast: true })
      .order("created_at", { ascending: true }); // Tiebreaker for consistent ordering

    if (school) {
      query = query.eq("school", school);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    return data.map((user, idx) => ({ ...user, rank: offset + idx + 1 }));
  },

  // Get current user's rank (1-based, positional ranking)
  async getUserRank(userId) {
    const { data: user } = await supabase
      .from(TABLE)
      .select("points, created_at")
      .eq("id", userId)
      .single();
    if (!user) return null;

    // Count users with more points (higher score = better rank)
    const { count: usersWithMorePoints } = await supabase
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .gt("points", user.points || 0);

    // Count users with same points but created earlier (consistent tiebreaker)
    const { count: usersWithSamePointsEarlier } = await supabase
      .from(TABLE)
      .select("*", { count: "exact", head: true })
      .eq("points", user.points || 0)
      .lt("created_at", user.created_at);

    return (usersWithMorePoints || 0) + (usersWithSamePointsEarlier || 0) + 1;
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

  // Search leaderboard by name or school
  async searchLeaderboard(searchTerm, limit, offset, school = null) {
    const lowerSearchTerm = searchTerm.toLowerCase();

    let query = supabase
      .from(TABLE)
      .select("id, name, profile_url, school, points, created_at")
      .or(`name.ilike.%${lowerSearchTerm}%,school.ilike.%${lowerSearchTerm}%`)
      .order("points", { ascending: false, nullsLast: true })
      .order("created_at", { ascending: true }); // Tiebreaker

    if (school) {
      query = query.eq("school", school);
    }

    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    // Calculate actual global rank for each user (not just search position)
    const resultsWithRanks = await Promise.all(
      data.map(async (user) => {
        const rank = await this.getUserRank(user.id);
        return { ...user, rank };
      }),
    );

    return resultsWithRanks;
  },

  // Interest Vector Methods

  // Get or compute user's interest vector (30-minute cache)
  async getOrComputeInterestVector(userId) {
    try {
      // Check if we have a recent vector (less than 30 minutes old)
      const { data: stored } = await supabase
        .from("user_interest_vectors")
        .select("interest_vector, updated_at")
        .eq("user_id", userId)
        .single();

      const vectorAgeMinutes = stored?.updated_at
        ? (Date.now() - new Date(stored.updated_at).getTime()) / (1000 * 60)
        : Infinity;

      if (stored?.interest_vector && vectorAgeMinutes < 30) {
        console.log(
          `✅ Using cached interest vector (age: ${vectorAgeMinutes.toFixed(1)}min)`,
        );
        return stored.interest_vector;
      }

      // Vector is stale or missing - recompute
      console.log(
        `🔄 Computing new interest vector (age: ${vectorAgeMinutes === Infinity ? "none" : vectorAgeMinutes.toFixed(1)}min)`,
      );
      return await this.computeInterestVector(userId);
    } catch (err) {
      console.error("Failed to get/compute interest vector:", err);
      return null;
    }
  },

  // Compute user's interest vector from recent activities
  async computeInterestVector(userId) {
    try {
      // Dynamically import the required modules
      const { UserActivityModel } = await import("./user_activity_model.js");
      const { weightedAverageVectors } =
        await import("../utils/vector_utils.js");

      // Get user's recent activities (within last 24 hours)
      const activities = await UserActivityModel.getRecentActivities(
        userId,
        1440,
      );

      if (!activities || activities.length === 0) {
        console.log("📊 No recent activities for user - returning null vector");
        return null;
      }

      // Filter activities that have valid embeddings
      const activitiesWithEmbeddings = activities
        .filter((a) => a.forum && a.forum.embedding)
        .map((a) => ({
          action_type: a.action_type,
          embedding: a.forum.embedding,
        }));

      if (activitiesWithEmbeddings.length === 0) {
        console.log("📊 No activities with embeddings - returning null vector");
        return null;
      }

      // Compute weighted average vector
      const interestVector = weightedAverageVectors(activitiesWithEmbeddings);

      if (!interestVector) {
        console.log("📊 Failed to compute vector - returning null");
        return null;
      }

      // Save the computed vector
      await this.saveInterestVector(userId, interestVector);

      console.log(
        `✅ Computed interest vector from ${activitiesWithEmbeddings.length} activities`,
      );
      return interestVector;
    } catch (err) {
      console.error("Failed to compute interest vector:", err);
      return null;
    }
  },

  // Save interest vector for user
  async saveInterestVector(userId, vector) {
    try {
      if (!vector || !Array.isArray(vector)) {
        throw new Error("Invalid vector format");
      }

      const now = new Date().toISOString();

      // Delete existing record if it exists
      await supabase
        .from("user_interest_vectors")
        .delete()
        .eq("user_id", userId);

      // Insert new record
      const { data, error } = await supabase
        .from("user_interest_vectors")
        .insert({
          user_id: userId,
          interest_vector: vector,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Failed to save interest vector:", err);
      throw err;
    }
  },

  // Invalidate interest vector (force recompute on next fetch)
  async invalidateInterestVector(userId) {
    try {
      const { error } = await supabase
        .from("user_interest_vectors")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Failed to invalidate interest vector:", err);
      return { success: false };
    }
  },

  // Clean up old interest vectors (older than 30 minutes)
  async cleanupStaleVectors() {
    try {
      const thirtyMinutesAgo = new Date(
        Date.now() - 30 * 60 * 1000,
      ).toISOString();

      const { error } = await supabase
        .from("user_interest_vectors")
        .delete()
        .lt("updated_at", thirtyMinutesAgo);

      if (error) throw error;
      console.log("✅ Cleaned up stale interest vectors");
      return { success: true };
    } catch (err) {
      console.error("Failed to cleanup stale vectors:", err);
      return { success: false };
    }
  },
};
