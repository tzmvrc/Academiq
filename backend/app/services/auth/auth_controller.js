import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { UserModel } from "../../models/user_model.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const generateToken = (userId) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });

export const AuthController = {
  // =================================
  // Manual Signup
  // =================================
  async signup(req, res) {
    try {
      const { email, password, name, school } = req.body;

      if (!email || !password || !name || !school) {
        throw new Error("All fields are required");
      }

      const existing = await UserModel.findByEmail(email);
      if (existing) throw new Error("Email already registered");

      const hashed = await bcrypt.hash(password, 10);

      const user = await UserModel.create({
        email,
        password: hashed,
        name,
        school
      });

      const token = generateToken(user.id);

      res.status(201).json({
        message: "Signup successful",
        user,
        token
      });

    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  // =================================
  // Manual Login
  // =================================
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await UserModel.findByEmail(email);
      if (!user) throw new Error("Invalid credentials");

      if (!user.password) {
        throw new Error("Use Google login for this account");
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) throw new Error("Invalid credentials");

      await UserModel.updateLastLogin(user.id);

      const token = generateToken(user.id);

      res.json({
        message: "Login successful",
        user,
        token
      });

    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  },

  // =================================
  // Google Login
  // =================================
  async googleLogin(req, res) {
    try {
      const { id_token } = req.body;

      if (!id_token) throw new Error("Google token required");

      // verify with Google
      const ticket = await client.verifyIdToken({
        idToken: id_token,
        audience: GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();

      const {
        sub: google_id,
        email,
        name,
        picture
      } = payload;

      let user = await UserModel.findByGoogleId(google_id);

      // create if first time
      if (!user) {
        user = await UserModel.create({
          email,
          google_id,
          name,
          profile_url: picture
        });
      }

      await UserModel.updateLastLogin(user.id);

      const token = generateToken(user.id);

      res.json({
        message: "Google login successful",
        user,
        token
      });

    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  },

  // =================================
  // Get Current User (protected route later)
  // =================================
  async getMe(req, res) {
    try {
      const userId = req.user.userId; // from JWT middleware later

      const user = await UserModel.findById(userId);

      res.json(user);

    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  }
};
