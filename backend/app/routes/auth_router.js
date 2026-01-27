import express from "express";
import { authMiddleware } from "../middlewares/auth_middleware.js";
import { AuthController } from "../services/auth/auth_controller.js";

const router = express.Router();

// Manual
router.post("/signup", AuthController.signup);
router.post("/login",authMiddleware, AuthController.login);

// Google
router.post("/google",authMiddleware, AuthController.googleLogin);

// Profile (protected later with middleware)
router.get("/me", authMiddleware,AuthController.getMe);

export default router;
