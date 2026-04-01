import express from "express";
import { AuthController } from "../services/auth/auth_controller.js";
import { authMiddleware } from "..//middlewares/auth_middleware.js";

const router = express.Router();

// Google login route (no middleware needed)
router.post("/google", AuthController.googleLogin);

// Manual login route (no middleware needed)
router.post("/login", AuthController.manualLogin);

// Signup flow
router.post("/signup/send-otp", AuthController.sendSignupOTP);
router.post("/signup/verify-otp", AuthController.verifySignupOTP);
router.post("/signup/complete", AuthController.completeSignup);

// Protected route for current user
router.get("/me", authMiddleware, AuthController.getMe);
router.post("/logout", authMiddleware, AuthController.logout);
// In auth_router.js
router.get("/users", authMiddleware, AuthController.getAllUsers);
// Get user by ID (must come after the specific /users route to avoid conflict)
router.get("/users/:id", authMiddleware, AuthController.getUserById);
router.get("/users/name/:name", authMiddleware, AuthController.getUserByName);

// in auth_router.js (or a dedicated search router)
router.get(
  "/search/suggestions",
  authMiddleware,
  AuthController.getSuggestions,
);
router.get("/search", authMiddleware, AuthController.search);

export default router;
