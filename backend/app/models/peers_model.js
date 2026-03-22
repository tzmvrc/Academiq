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
    return supabase
      .from("users")
      .select(USER_SELECT)
      .eq("id", id)
      .single();
  },

  // Insert a new follow relationship
  async followUser(payload) {
    return supabase
      .from(TABLE)
      .insert(payload)
      .select()
      .single();
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