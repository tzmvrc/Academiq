import { UserFollowModel } from "../../models/peers_model.js";
import { UserModel } from "../../models/user_model.js";
import { NotificationService } from "../../services/notification/notification_service.js";
import { supabase } from "../../database/supabase.js";
import { getIO } from "../../middlewares/socket.js";

export const UserFollowsController = {
  // GET /api/users/:id/followers
  async getFollowers(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await UserFollowModel.findFollowers(id);
      if (error) throw error;

      // Ensure we return user objects with proper structure
      const followers = (data || []).map((f) => ({
        id: f.id || f.follower?.id,
        name: f.name || f.follower?.name,
        profile_url: f.profile_url || f.follower?.profile_url,
        school: f.school || f.follower?.school,
      }));

      res.json({ followers });
    } catch (err) {
      console.error("Get Followers Error:", err);
      res.status(500).json({ error: "Failed to fetch followers" });
    }
  },

  // GET /api/users/:id/following
  async getFollowing(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await UserFollowModel.findFollowing(id);
      if (error) throw error;

      // Ensure we return user objects with proper structure
      const following = (data || []).map((f) => ({
        id: f.id || f.following?.id,
        name: f.name || f.following?.name,
        profile_url: f.profile_url || f.following?.profile_url,
        school: f.school || f.following?.school,
      }));

      res.json({ following });
    } catch (err) {
      console.error("Get Following Error:", err);
      res.status(500).json({ error: "Failed to fetch following" });
    }
  },

  // In UserFollowsController, add:
  async getAllUsers(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const users = await UserFollowModel.getAllUsersWithFollowStatus(userId);
      res.json({ users });
    } catch (err) {
      console.error("Get All Users Error:", err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },

  // GET /api/users/me/following
  async getMyFollowing(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { data, error } = await UserFollowModel.findFollowing(userId);
      if (error) throw error;

      res.json({ following: data });
    } catch (err) {
      console.error("Get My Following Error:", err);
      res.status(500).json({ error: "Failed to fetch following" });
    }
  },

  // POST /api/users/:id/follow
  async followUser(req, res) {
    try {
      const followerId = req.user?.id;
      if (!followerId) return res.status(401).json({ error: "Unauthorized" });

      const followingId = req.params.id;

      if (followerId === followingId) {
        return res.status(400).json({ error: "You cannot follow yourself" });
      }

      const { data: existing, error: checkError } =
        await UserFollowModel.findFollow(followerId, followingId);
      if (checkError) throw checkError;

      if (existing) {
        return res
          .status(400)
          .json({ error: "You are already following this user" });
      }

      const { data: target, error: userError } =
        await UserFollowModel.findUserById(followingId);
      if (userError) throw userError;
      if (!target) return res.status(404).json({ error: "User not found" });

      const payload = {
        follower_id: followerId,
        following_id: followingId,
      };

      const { data, error } = await UserFollowModel.followUser(payload);
      if (error) throw error;

      // --- Notification to the followed user ---
      const followerUser = await UserModel.findById(followerId);
      if (followerUser && followingId !== followerId) {
        await NotificationService.createNotification({
          userId: followingId,
          type: "follow",
          referenceId: followerId,
          message: `${followerUser.name} started following you`,
          metadata: {
            followerName: followerUser.name,
            followerId,
            profile_url: followerUser.profile_url,
          },
        });
      }

      // --- Emit real-time follow event to both users ---
      const io = getIO();
      if (io) {
        // Notify the followed user of updated counts
        io.to(`user:${followingId}`).emit("follow_stats_updated", {
          userId: followingId,
          followers_count: (await getUserFollowStatsData(followingId))
            .followers_count,
        });
        // Notify the follower of updated counts
        io.to(`user:${followerId}`).emit("follow_stats_updated", {
          userId: followerId,
          following_count: (await getUserFollowStatsData(followerId))
            .following_count,
        });
      }

      res
        .status(201)
        .json({ message: "User followed successfully", follow: data });
    } catch (err) {
      console.error("Follow User Error:", err);
      res.status(500).json({ error: "Failed to follow user" });
    }
  },

  // DELETE /api/users/:id/unfollow
  // DELETE /api/users/:id/unfollow
  async unfollowUser(req, res) {
    try {
      const followerId = req.user?.id;
      if (!followerId) return res.status(401).json({ error: "Unauthorized" });

      const followingId = req.params.id;

      if (followerId === followingId) {
        return res.status(400).json({ error: "You cannot unfollow yourself" });
      }

      const { data: existing, error: checkError } =
        await UserFollowModel.findFollow(followerId, followingId);
      if (checkError) throw checkError;

      if (!existing) {
        return res
          .status(400)
          .json({ error: "You are not following this user" });
      }

      const { error } = await UserFollowModel.unfollowUser(
        followerId,
        followingId,
      );
      if (error) throw error;

      // --- Emit real-time unfollow event to both users ---
      const io = getIO();
      if (io) {
        // Notify the unfollowed user of updated counts
        io.to(`user:${followingId}`).emit("follow_stats_updated", {
          userId: followingId,
          followers_count: (await getUserFollowStatsData(followingId))
            .followers_count,
        });
        // Notify the unfollower of updated counts
        io.to(`user:${followerId}`).emit("follow_stats_updated", {
          userId: followerId,
          following_count: (await getUserFollowStatsData(followerId))
            .following_count,
        });
      }

      res.json({ message: "User unfollowed successfully" });
    } catch (err) {
      console.error("Unfollow User Error:", err);
      res.status(500).json({ error: "Failed to unfollow user" });
    }
  },
  // GET /api/peers/:id/stats - Get follower/following counts from database
  async getUserFollowStats(req, res) {
    try {
      const { id } = req.params;
      const stats = await getUserFollowStatsData(id);
      res.json(stats);
    } catch (err) {
      console.error("Get Follow Stats Error:", err);
      res.status(500).json({ error: "Failed to fetch follow stats" });
    }
  },
};

// Helper function to get follow stats directly from database
async function getUserFollowStatsData(userId) {
  // Get followers count (users following this user)
  const { count: followersCount, error: followersError } = await supabase
    .from("user_follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", userId);
  if (followersError) throw followersError;

  // Get following count (users this user is following)
  const { count: followingCount, error: followingError } = await supabase
    .from("user_follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);
  if (followingError) throw followingError;

  return {
    followers_count: followersCount || 0,
    following_count: followingCount || 0,
  };
}
