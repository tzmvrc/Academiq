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

export default router;
