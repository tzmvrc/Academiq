import { OAuth2Client } from "google-auth-library";
import { UserModel } from "../../models/user_model.js";
import { SchoolModel } from "../../models/schools_model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OtpModel } from "../../models/otp_model.js";
import axios from "axios";
import sgMail from "@sendgrid/mail";
import { title } from "process";

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
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
};

const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
];

function getRootDomain(email) {
  const domainPart = email.split("@")[1]; // "mkt.ceu.edu.ph"
  const parts = domainPart.split(".");
  if (parts.length > 2) {
    // take last two parts for the root domain (e.g., "ceu.edu.ph")
    return parts.slice(-3).join(".");
  }
  return domainPart;
}

export const AuthController = {
  // =============================
  // Google Login
  // =============================

  async googleLogin(req, res) {
    try {
      const { code } = req.body;
      if (!code)
        return res.status(400).json({ error: "Authorization code required" });

      // STEP 1 — Exchange code for tokens
      const { tokens } = await client.getToken(code);
      const idToken = tokens.id_token;
      if (!idToken)
        return res
          .status(400)
          .json({ error: "No ID token returned from Google" });

      // STEP 2 — Verify ID token
      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { sub: google_id, email, name, picture } = payload;

      // STEP 3 — Extract root domain for school validation
      const domainParts = email.split("@")[1].split(".");
      const rootDomain =
        domainParts.length > 2
          ? domainParts.slice(-3).join(".")
          : domainParts.join(".");

      // STEP 4 — Validate school
      const response = await axios.get(
        `http://universities.hipolabs.com/search?domain=${rootDomain}`,
      );
      if (!response.data || response.data.length === 0) {
        return res.status(400).json({
          title: "Invalid School Email",
          message: "Google login requires a valid school email.",
        });
      }
      const schoolInfo = response.data[0];
      const schoolName = schoolInfo.name;
      const schoolDomain = rootDomain;

      // Check if school exists in database, if not create it
      let school = await SchoolModel.findByEmailDomain(schoolDomain);
      if (!school) {
        school = await SchoolModel.create({
          school_name: schoolName,
          email_domain: schoolDomain,
        });
      }

      // STEP 5 — Fetch or create user
      // Check by google_id first (existing Google user)
      let user = await UserModel.findByGoogleId(google_id);

      if (user) {
        // Existing Google user → just log them in
      } else {
        // Check if user exists by email
        user = await UserModel.findByEmail(email);
        if (user) {
          // Existing manual account → link Google
          if (!user.google_id) {
            await UserModel.updateGoogleId(user.id, google_id);
            user.google_id = google_id;
          }
        } else {
          // New user → create Google account
          user = await UserModel.create({
            email,
            google_id,
            name,
            profile_url: picture,
            school_id: school.id,
            onboarding_completed: false, // mark as new
          });
        }
      }

      // STEP 6 — Update last login
      await UserModel.updateLastLogin(user.id);

      // STEP 7 — Generate JWT token
      const token = generateToken(user.id);

      // STEP 8 — Send response including onboardingRequired
      res.json({
        message: "Google login successful",
        user,
        token,
        onboardingRequired: !user.onboarding_completed, // frontend can redirect
      });
    } catch (err) {
      console.error("Google Login Error:", err);
      res.status(401).json({ error: "Invalid Google login" });
    }
  },

  async manualLogin(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          message: "Email and password are required",
        });
      }

      // 1. Find user
      const user = await UserModel.findByEmail(email);

      if (!user) {
        return res.status(400).json({
          title: "User Not Found",
          message: "Please sign up for an account.",
        });
      }

      // 2. Prevent manual login if Google-only account
      if (user.google_id && !user.password) {
        return res.status(400).json({
          title: "Google Account Detected",
          message:
            "This account was created using Google. Please login using Google.",
        });
      }

      // 3. Verify password
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({
          title: "Incorrect Credentials",
          message: "Incorrect email or password.",
        });
      }

      // 4. Update last login
      await UserModel.updateLastLogin(user.id);

      // 5. Generate token
      const token = generateToken(user.id);

      // 6. Send response
      res.json({
        message: "Login successful",
        user,
        token,
        onboardingRequired: !user.onboarding_completed,
      });
    } catch (err) {
      console.error("Manual Login Error:", err);
      res.status(500).json({ error: "Login failed" });
    }
  },

  // =============================
  // Get Current User
  // =============================
  async getMe(req, res) {
    try {
      const userId = req.user.id;
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
      const userId = req.user.id;

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

      // Check if user exists
      const existingUser = await UserModel.findByEmail(email);

      if (existingUser) {
        if (existingUser.google_id && !existingUser.password) {
          return res.status(409).json({
            title: "Google Account Detected",
            message:
              "This email is registered using Google. Please login using Google.",
          });
        }

        return res.status(409).json({
          title: "Email Already Registered",
          message: "This email is already registered. Please log in.",
        });
      }

      // Extract domain
      const domain = getRootDomain(email.toLowerCase());

      // Block personal email domains
      if (PERSONAL_EMAIL_DOMAINS.includes(domain)) {
        return res.status(400).json({
          title: "Invalid Email",
          message: "Please use your school email address.",
        });
      }

      // Check domain via Universities API
      const response = await axios.get(
        `http://universities.hipolabs.com/search?domain=${domain}`,
      );

      if (!response.data || response.data.length === 0) {
        return res.status(400).json({
          title: "Invalid School Email",
          message: "No university found with this email domain.",
        });
      }

      // Use the first match
      const schoolInfo = response.data[0];
      const school_name = schoolInfo.name;
      const school_domain = schoolInfo.domains[0];

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await OtpModel.create({
        email,
        otp_hash: otpHash,
        expires_at: expiresAt,
        purpose: "signup",
      });

      // Send OTP
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

      // Return school info
      res.json({
        title: "OTP Sent",
        message: "An OTP has been sent to your email address.",
        success: true,
        school_name,
        school_domain,
      });
    } catch (err) {
      console.error("Send OTP Error:", err);
      res.status(500).json({ error: "Failed to send OTP" });
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
        return res.status(400).json({
          title: "Invalid OTP",
          message: "The OTP you entered is incorrect.",
        });
      }

      // Success: mark verified
      await OtpModel.markVerified(email);

      res.json({
        title: "Email Verified",
        message: "Your email has been verified.",
      });
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

      // STEP 1 — Check OTP verification
      const record = await OtpModel.findByEmail(email);
      if (!record || !record.verified) {
        return res.status(400).json({ error: "Email not verified" });
      }

      // STEP 2 — Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        if (existingUser.google_id && !existingUser.password) {
          return res.status(400).json({
            title: "Google Account Detected",
            message:
              "This email is already registered using Google. Please login using Google.",
          });
        }
        return res.status(400).json({
          title: "Account Already Exists",
          message: "This email is already registered. Please log in.",
        });
      }

      // STEP 3 — Extract root domain
      const domainPart = email.split("@")[1];
      const domainParts = domainPart.split(".");
      const rootDomain =
        domainParts.length > 2 ? domainParts.slice(-3).join(".") : domainPart;

      // STEP 4 — Validate school and get school_id
      const response = await axios.get(
        `http://universities.hipolabs.com/search?domain=${rootDomain}`,
      );
      if (!response.data || response.data.length === 0) {
        return res.status(400).json({
          title: "Invalid School Email",
          message:
            "The provided email domain is not recognized as a valid school.",
        });
      }
      const schoolInfo = response.data[0];
      const schoolName = schoolInfo.name;
      const schoolDomain = rootDomain;

      // Check if school exists in database, if not create it
      let school = await SchoolModel.findByEmailDomain(schoolDomain);
      if (!school) {
        school = await SchoolModel.create({
          school_name: schoolName,
          email_domain: schoolDomain,
        });
      }

      // STEP 5 — Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // STEP 6 — Create user
      const user = await UserModel.create({
        email,
        password: hashedPassword,
        name,
        school_id: school.id,
        onboarding_completed: false, // new user must do onboarding
      });

      // STEP 7 — Cleanup OTP
      await OtpModel.delete(email);

      // STEP 8 — Generate JWT token
      const token = generateToken(user.id);

      // STEP 9 — Respond
      res.json({
        message: "Signup successful",
        user,
        token,
        onboardingRequired: true, // new users must do onboarding
      });
    } catch (err) {
      console.error("Complete Signup Error:", err);
      res.status(500).json({ error: "Signup failed" });
    }
  },
};
