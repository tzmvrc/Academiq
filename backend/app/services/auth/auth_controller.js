import { OAuth2Client } from "google-auth-library";
import { UserModel } from "../../models/user_model.js";
import jwt from "jsonwebtoken";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:8080"
);

// Generate JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};

export const AuthController = {
  // =============================
  // Google Login
  // =============================
  // =============================
// Google Login (Auth Code Flow)
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
      return res.status(400).json({ error: "No ID token returned from Google" });
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

      if (!user)
        return res.status(404).json({ error: "User not found" });

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
};
