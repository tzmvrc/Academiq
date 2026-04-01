import express from "express";
import { UserFollowsController } from "../services/peers/peers_controller.js";
import { authMiddleware } from "../middlewares/auth_middleware.js";

const router = express.Router();

/**
 * IMPORTANT:
 * Put "/users/me" BEFORE "/users/:id" to avoid route conflicts.
 */

// Protected - get users the authenticated user is following
router.get("/users/me/following", authMiddleware, UserFollowsController.getMyFollowing);
router.get('/users', authMiddleware, UserFollowsController.getAllUsers);

// Public - get all followers of a user
router.get("/users/:id/followers", UserFollowsController.getFollowers);

// Public - get all users a user is following
router.get("/users/:id/following", UserFollowsController.getFollowing);

// Protected - follow a user
router.post("/:id/follow", authMiddleware, UserFollowsController.followUser);

// Protected - unfollow a user
router.delete("/:id/unfollow", authMiddleware, UserFollowsController.unfollowUser);

export default router;