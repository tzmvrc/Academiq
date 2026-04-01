import { supabase } from "../database/supabase.js";

const TABLE = "user_follows";

const USER_SELECT = `
  id,
  name,
  profile_url,
  bio,
  school,
  points,
  followers_count,
  following_count
`;

export const UserFollowModel = {
  // Find all users who follow the given user (their followers)
  async findFollowers(userId) {
    return supabase
      .from(TABLE)
      .select(`follower:follower_id (${USER_SELECT}), created_at`)
      .eq("following_id", userId)
      .order("created_at", { ascending: false });
  },

  // Find all users the given user is following
  async findFollowing(userId) {
    return supabase
      .from(TABLE)
      .select(`following:following_id (${USER_SELECT}), created_at`)
      .eq("follower_id", userId)
      .order("created_at", { ascending: false });
  },

  // Check if a follow relationship exists between two users
  async findFollow(followerId, followingId) {
    return supabase
      .from(TABLE)
      .select("*")
      .eq("follower_id", followerId)
      .eq("following_id", followingId)
      .maybeSingle();
  },

  // Find a user by ID (used to validate target user exists)
  async findUserById(id) {
    return supabase.from("users").select(USER_SELECT).eq("id", id).single();
  },

  // Insert a new follow relationship
  async followUser(payload) {
    return supabase.from(TABLE).insert(payload).select().single();
  },

  // In UserFollowModel, add:
  async getAllUsersWithFollowStatus(currentUserId) {
    // First get all users except current user
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select(
        "id, name, profile_url, school, bio, points, followers_count, following_count",
      )
      .neq("id", currentUserId)
      .order("name", { ascending: true });
    if (usersError) throw usersError;

    if (users.length === 0) return [];

    // Get the list of user IDs the current user is following
    const { data: follows, error: followsError } = await supabase
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", currentUserId);
    if (followsError) throw followsError;

    const followingIds = new Set(follows.map((f) => f.following_id));

    // Attach is_followed flag
    return users.map((user) => ({
      ...user,
      is_followed: followingIds.has(user.id),
    }));
  },

  // Delete a follow relationship
  async unfollowUser(followerId, followingId) {
    return supabase
      .from(TABLE)
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", followingId);
  },
};
