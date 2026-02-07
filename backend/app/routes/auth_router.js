import express from "express";
import { AuthController } from "../services/auth/auth_controller.js";
import { authMiddleware } from "..//middlewares/auth_middleware.js";

const router = express.Router();

// Google login route (no middleware needed)
router.post("/google", AuthController.googleLogin);

// Protected route for current user
router.get("/me", authMiddleware, AuthController.getMe);

router.post("/logout", authMiddleware, AuthController.logout);

export default router;
