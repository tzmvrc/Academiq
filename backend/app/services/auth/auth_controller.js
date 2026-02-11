import { OAuth2Client } from "google-auth-library";
import { UserModel } from "../../models/user_model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OtpModel } from "../../models/otp_model.js";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:8080",
);

// Generate JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};

export const AuthController = {
  // =============================
  // Google Login
  // =============================

  async googleLogin(req, res) {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ error: "Authorization code required" });
      }

      // STEP 1 — exchange code for tokens
      const { tokens } = await client.getToken(code);

      const idToken = tokens.id_token;

      if (!idToken) {
        return res
          .status(400)
          .json({ error: "No ID token returned from Google" });
      }

      // STEP 2 — verify id token
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      const { sub: google_id, email, name, picture } = payload;

      let user = await UserModel.findByGoogleId(google_id);

      if (!user) {
        user = await UserModel.create({
          email,
          google_id,
          name,
          profile_url: picture,
        });
      }

      await UserModel.updateLastLogin(user.id);

      const token = generateToken(user.id);

      res.json({
        message: "Google login successful",
        user,
        token,
      });
    } catch (err) {
      console.error("Google Login Error:", err);
      res.status(401).json({ error: "Invalid Google login" });
    }
  },

  // =============================
  // Get Current User
  // =============================
  async getMe(req, res) {
    try {
      const userId = req.user.userId;
      const user = await UserModel.findById(userId);

      if (!user) return res.status(404).json({ error: "User not found" });

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        profile_url: user.profile_url,
        role: user.role,
        school: user.school,
      });
    } catch (err) {
      console.error("GetMe Error:", err.message);
      res.status(401).json({ error: "Unauthorized" });
    }
  },

  // =============================
  // Logout
  // =============================
  async logout(req, res) {
    try {
      const userId = req.user.userId;

      // Optional: update last activity or logout time
      await UserModel.updateLastLogin(userId);

      // JWT is stateless → frontend deletes token
      return res.json({ message: "Logout successful" });
    } catch (err) {
      console.error("Logout Error:", err.message);
      res.status(500).json({ error: "Logout failed" });
    }
  },

  // =============================
  // Send Signup OTP
  // =============================
  async sendSignupOTP(req, res) {
    try {
      const { email } = req.body;

      if (!email) return res.status(400).json({ error: "Email required" });

      // 🔥 IMPORTANT: check USERS first
      const existingUser = await UserModel.findByEmail(email);

      if (existingUser) {
        return res.status(409).json({
          title: "Email Already Registered",
          message: "This email is already registered. Please log in.",
        });
      }

      // generate 6 digit otp
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      const otpHash = await bcrypt.hash(otp, 10);

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await OtpModel.upsert({
        email,
        otp_hash: otpHash,
        expires_at: expiresAt,
      });

      await sgMail.send({
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject: "Your Academiq OTP Code",
        html: `
        <h2>Email Verification</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>Expires in 10 minutes</p>
      `,
      });

      res.json({  title: "OTP Sent",
          message: "An OTP has been sent to your email address.",});
    } catch (err) {
      console.error("Send OTP Error:", err);
      res.json({ error: "Failed to send OTP" });
    }
  },

  // =============================
  // Verify Signup OTP
  // =============================
  async verifySignupOTP(req, res) {
    try {
      const { email, otp } = req.body;

      const record = await OtpModel.findByEmail(email);

      if (!record) return res.status(400).json({ error: "OTP not found" });

      // Check expiration
      if (new Date(record.expires_at) < new Date()) {
        await OtpModel.delete(email); // <-- delete expired OTP
        return res.json({ error: "OTP expired" });
      }

      if (record.attempts >= 5)
        return res.status(429).json({ error: "Too many attempts" });

      const match = await bcrypt.compare(otp, record.otp_hash);

      if (!match) {
        await OtpModel.incrementAttempts(email); // increment attempts
        return res.status(400).json({ title: "Invalid OTP", message: "The OTP you entered is incorrect." });
      }

      // Success: mark verified
      await OtpModel.markVerified(email);

      res.json({title: "Email Verified", message: "Your email has been verified." });
    } catch (err) {
      console.error("Verify OTP Error:", err);
      res.status(500).json({ error: "Verification failed" });
    }
  },

  // =============================
  // Complete Signup
  // =============================
  async completeSignup(req, res) {
    try {
      const { email, name, password } = req.body;

      const record = await OtpModel.findByEmail(email);

      if (!record || !record.verified) {
        return res.json({
          error: "Email not verified",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await UserModel.create({
        email,
        password: hashedPassword,
        name,
      });

      await OtpModel.delete(email);

      const token = generateToken(user.id);

      res.json({
        message: "Signup successful",
        user,
        token,
      });
    } catch (err) {
      console.error("Complete Signup Error:", err);
      res.status(500).json({ error: "Signup failed" });
    }
  },
};
