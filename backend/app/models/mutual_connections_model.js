import { supabase } from "../database/supabase.js";

const TABLE = "user_mutual_connections";

export const MutualConnectionsModel = {
  // Calculate mutual followers between two users
  async calculateMutualCount(userId1, userId2) {
    try {
      // Get followers of user1
      const { data: followers1 } = await supabase
        .from("user_follows")
        .select("follower_id")
        .eq("following_id", userId1);

      if (!followers1 || followers1.length === 0) return 0;
      const followerIds1 = followers1.map((f) => f.follower_id);

      // Get followers of user2
      const { data: followers2 } = await supabase
        .from("user_follows")
        .select("follower_id")
        .eq("following_id", userId2);

      if (!followers2 || followers2.length === 0) return 0;
      const followerIds2 = followers2.map((f) => f.follower_id);

      // Find intersection
      const mutual = followerIds1.filter((id) => followerIds2.includes(id));
      return mutual.length;
    } catch (err) {
      console.error("Error calculating mutual count:", err);
      return 0;
    }
  },

  // Store/update mutual connection count
  async updateMutualCount(userId1, userId2, mutualCount) {
    try {
      // Ensure userId1 < userId2 for consistency
      const [ua, ub] =
        userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

      const { data: existing } = await supabase
        .from(TABLE)
        .select("*")
        .eq("user_a_id", ua)
        .eq("user_b_id", ub)
        .single();

      if (existing) {
        const { error } = await supabase
          .from(TABLE)
          .update({
            mutual_count: mutualCount,
            updated_at: new Date().toISOString(),
          })
          .eq("user_a_id", ua)
          .eq("user_b_id", ub);

        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLE).insert([
          {
            user_a_id: ua,
            user_b_id: ub,
            mutual_count: mutualCount,
          },
        ]);

        if (error) throw error;
      }
    } catch (err) {
      console.error("Error updating mutual count:", err);
      throw err;
    }
  },

  // Get users you may know - simple approach: get 10 random unfollowed users, sort by mutual
  async getUsersYouMayKnow(userId, limit = 10) {
    try {
      // Get people I follow
      const { data: myFollowing } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", userId);

      const followingIds = new Set(
        myFollowing?.map((f) => f.following_id) || [],
      );

      // Get people who follow me (for calculating mutual)
      const { data: peopleWhoFollowMe } = await supabase
        .from("user_follows")
        .select("follower_id")
        .eq("following_id", userId);

      const followerIds = new Set(
        peopleWhoFollowMe?.map((f) => f.follower_id) || [],
      );

      // Get all users and filter locally
      const { data: allUsers } = await supabase
        .from("users")
        .select("id, name, profile_url, school, followers_count, bio");

      if (!allUsers || allUsers.length === 0) {
        return [];
      }

      // Filter out: self and already following
      const unfollowedUsers = allUsers.filter(
        (user) => user.id !== userId && !followingIds.has(user.id),
      );

      if (unfollowedUsers.length === 0) {
        return [];
      }

      // Randomly shuffle and take first 'limit' users
      for (let i = unfollowedUsers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [unfollowedUsers[i], unfollowedUsers[j]] = [
          unfollowedUsers[j],
          unfollowedUsers[i],
        ];
      }

      const randomUsers = unfollowedUsers.slice(0, limit);

      // Add mutual_count to each user
      const usersWithMutual = randomUsers.map((user) => {
        const isMutualConnection = followerIds.has(user.id);
        return {
          ...user,
          mutual_count: isMutualConnection ? 1 : 0,
        };
      });

      // Sort by mutual_count DESC (mutual connections first)
      usersWithMutual.sort((a, b) => b.mutual_count - a.mutual_count);

      return usersWithMutual;
    } catch (err) {
      console.error("Error fetching users you may know:", err);
      return [];
    }
  },

  // Get popular users (for cold start)
  async getPopularUsers(userId, limit = 6) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, profile_url, school, followers_count")
        .neq("id", userId)
        .order("followers_count", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data?.map((u) => ({ ...u, mutual_count: 0 })) || [];
    } catch (err) {
      console.error("Error fetching popular users:", err);
      return [];
    }
  },

  // Batch update mutual connections (run periodically)
  async batchUpdateMutualConnections(userIds = null) {
    try {
      let query = supabase.from("users").select("id");
      if (userIds && userIds.length > 0) {
        query = query.in("id", userIds);
      }

      const { data: users, error: userError } = await query;
      if (userError) throw userError;

      console.log(
        `Updating mutual connections for ${users?.length || 0} users`,
      );

      for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < Math.min(i + 50, users.length); j++) {
          const mutualCount = await this.calculateMutualCount(
            users[i].id,
            users[j].id,
          );
          if (mutualCount > 0) {
            await this.updateMutualCount(users[i].id, users[j].id, mutualCount);
          }
        }
      }
    } catch (err) {
      console.error("Error in batch update:", err);
    }
  },
};
