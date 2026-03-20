import { UserFollowModel } from "../../models/peers_model.js";

export const UserFollowsController = {
  // GET /api/users/:id/followers
  async getFollowers(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await UserFollowModel.findFollowers(id);
      if (error) throw error;

      res.json({ followers: data });
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

      res.json({ following: data });
    } catch (err) {
      console.error("Get Following Error:", err);
      res.status(500).json({ error: "Failed to fetch following" });
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

      res.status(201).json({ message: "User followed successfully", follow: data });
    } catch (err) {
      console.error("Follow User Error:", err);
      res.status(500).json({ error: "Failed to follow user" });
    }
  },

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

      res.json({ message: "User unfollowed successfully" });
    } catch (err) {
      console.error("Unfollow User Error:", err);
      res.status(500).json({ error: "Failed to unfollow user" });
    }
  },
};