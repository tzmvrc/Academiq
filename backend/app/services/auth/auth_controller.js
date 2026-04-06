import { OAuth2Client } from "google-auth-library";
import { UserModel } from "../../models/user_model.js";
import { SchoolModel } from "../../models/schools_model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OtpModel } from "../../models/otp_model.js";
import axios from "axios";
import sgMail from "@sendgrid/mail";
import { title } from "process";
import { findSchoolByDomain } from "../../services/school/schoolValidator.js";
import { supabase } from "../../database/supabase.js";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "postmessage",
);

// Helper: convert name to uppercase (e.g., "John Doe" -> "JOHN DOE")
const toUpperCaseName = (name) => name?.toUpperCase().trim() || "";

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

const getInitials = (name) => {
  if (!name) return "UN";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

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

      if (!code) {
        return res.status(400).json({ error: "Authorization code required" });
      }

      const { tokens } = await client.getToken(code);
      const idToken = tokens.id_token;

      if (!idToken) {
        return res.status(400).json({
          error: "No ID token returned from Google",
        });
      }

      const ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { sub: google_id, email, name, picture } = payload;

      // Uppercase the name
      const upperName = toUpperCaseName(name);

      // Extract domain
      const domainParts = email.split("@")[1].split(".");
      const rootDomain =
        domainParts.length > 2
          ? domainParts.slice(-3).join(".")
          : domainParts.join(".");

      // Validate school using local JSON
      const schoolInfo = findSchoolByDomain(rootDomain);
      if (!schoolInfo) {
        return res.status(400).json({
          title: "Invalid School Email",
          message: "Google login requires a valid school email.",
        });
      }

      let school = await SchoolModel.findByEmailDomain(rootDomain);

      if (!school) {
        school = await SchoolModel.create({
          school_name: schoolInfo.name,
          email_domain: rootDomain,
        });
      }

      // FIND USER
      let user = await UserModel.findByGoogleId(google_id);

      if (!user) {
        user = await UserModel.findByEmail(email);

        if (user) {
          if (!user.google_id) {
            await UserModel.updateGoogleId(user.id, google_id);
          }
          // Also update name to uppercase if it changed?
          if (user.name !== upperName) {
            await UserModel.update(user.id, { name: upperName });
          }
          user = await UserModel.findById(user.id);
        } else {
          user = await UserModel.create({
            email,
            google_id,
            name: upperName, // uppercase
            profile_url: picture,
            school_id: school.id,
            school: school.school_name, // store school name for easy access
            onboarding_completed: false,
          });
        }
      }

      await UserModel.updateLastLogin(user.id);

      const token = generateToken(user.id);

      res.json({
        message: "Google login successful",
        user,
        token,
        onboardingRequired: !user.onboarding_completed,
      });
    } catch (err) {
      console.error("Google Login Error:", err);
      res.status(401).json({ error: "Invalid Google login" });
    }
  },

  // In auth_controller.js
  async getUserById(req, res) {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({
        id: user.id,
        name: user.name,
        profile_url: user.profile_url,
        school: user.school,
        bio: user.bio,
        points: user.points || 0,
        followers_count: user.followers_count || 0,
        following_count: user.following_count || 0,
      });
    } catch (err) {
      console.error("Get user by ID error:", err);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  },

  // Add to AuthController object
  async getAllUsers(req, res) {
    try {
      const userId = req.user.id;
      const users = await UserModel.findAllExcept(userId);
      res.json({ users });
    } catch (err) {
      console.error("Get all users error:", err);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },

  async getUserByName(req, res) {
    try {
      const { name } = req.params;
      const user = await UserModel.findByName(name);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({
        id: user.id,
        name: user.name,
        profile_url: user.profile_url,
        school: user.school,
        bio: user.bio,
        points: user.points || 0,
        followers_count: user.followers_count || 0,
        following_count: user.following_count || 0,
      });
    } catch (err) {
      console.error("Get user by name error:", err);
      res.status(500).json({ error: "Failed to fetch user" });
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

      // Include points, followers_count, following_count, and maybe bio
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        profile_url: user.profile_url,
        role: user.role,
        school: user.school,
        points: user.points || 0,
        followers_count: user.followers_count || 0,
        following_count: user.following_count || 0,
        bio: user.bio || "",
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

      // Check domain via local JSON file
      const schoolInfo = findSchoolByDomain(domain);

      if (!schoolInfo) {
        return res.status(400).json({
          title: "Invalid School Email",
          message: "No university found with this email domain.",
        });
      }

      // Use the found school
      const school_name = schoolInfo.name;
      const school_domain = schoolInfo.domains[0]; // or domain, whichever you prefer

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

      console.log(`OTP for ${email}: ${otp} (expires at ${expiresAt})`);
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

      // STEP 4 — Validate school using local JSON
      const schoolInfo = findSchoolByDomain(rootDomain);
      if (!schoolInfo) {
        return res.status(400).json({
          title: "Invalid School Email",
          message:
            "The provided email domain is not recognized as a valid school.",
        });
      }

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

      // Uppercase the name
      const upperName = toUpperCaseName(name);

      // STEP 6 — Create user
      const user = await UserModel.create({
        email,
        password: hashedPassword,
        name: upperName,
        school_id: school.id,
        school: school.school_name,
        onboarding_completed: false,
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
        onboardingRequired: true,
      });
    } catch (err) {
      console.error("Complete Signup Error:", err);
      res.status(500).json({ error: "Signup failed" });
    }
  },

  // in your auth_controller.js or a new search_controller.js
  // Helper to get initials from name

  // =============================
  // Suggestions endpoint
  // =============================
  async getSuggestions(req, res) {
    try {
      const { q } = req.query;
      if (!q || q.trim().length < 2) {
        return res.json({ suggestions: [] });
      }
      const searchTerm = `%${q.trim()}%`;

      // Query forums (title)
      const { data: forums, error: forumsErr } = await supabase
        .from("forums")
        .select("id, title")
        .ilike("title", searchTerm)
        .limit(5);
      if (forumsErr) throw forumsErr;

      // Query users (name)
      const { data: users, error: usersErr } = await supabase
        .from("users")
        .select("id, name")
        .ilike("name", searchTerm)
        .limit(5);
      if (usersErr) throw usersErr;

      // Query subjects (name)
      const { data: subjects, error: subjectsErr } = await supabase
        .from("subjects")
        .select("id, name")
        .ilike("name", searchTerm)
        .limit(5);
      if (subjectsErr) throw subjectsErr;

      // Query tags (name)
      const { data: tags, error: tagsErr } = await supabase
        .from("tags")
        .select("id, name")
        .ilike("name", searchTerm)
        .limit(5);
      if (tagsErr) throw tagsErr;

      const suggestions = [
        ...(forums || []).map((f) => ({
          type: "forum",
          text: f.title,
          id: f.id,
        })),
        ...(users || []).map((u) => ({ type: "user", text: u.name, id: u.id })),
        ...(subjects || []).map((s) => ({
          type: "subject",
          text: s.name,
          id: s.id,
        })),
        ...(tags || []).map((t) => ({ type: "tag", text: t.name, id: t.id })),
      ];

      res.json({ suggestions });
    } catch (err) {
      console.error("Suggestion error:", err);
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  },

  // =============================
  // Full search endpoint
  // =============================
  async search(req, res) {
    try {
      const { q } = req.query;
      if (!q || q.trim().length < 2) {
        return res.json({ users: [], forums: [], subjects: [], tags: [] });
      }
      const searchTerm = q.trim();
      const currentUserId = req.user.id;

      // ------------------------------
      // 1. Users
      // ------------------------------
      const { data: users, error: usersErr } = await supabase
        .from("users")
        .select("id, name, profile_url, school, bio, points")
        .ilike("name", `%${searchTerm}%`)
        .limit(20);
      if (usersErr) throw usersErr;

      // Get follow status for each user
      const usersWithFollow = await Promise.all(
        (users || []).map(async (u) => {
          const { data: follow } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_id", currentUserId)
            .eq("following_id", u.id)
            .single();
          return { ...u, is_followed: !!follow };
        }),
      );

      // ------------------------------
      // 2. Forums (by title, content, or tags)
      // ------------------------------
      // First, find tags that match the search term
      const { data: matchingTags } = await supabase
        .from("tags")
        .select("id")
        .ilike("name", `%${searchTerm}%`);

      const tagIds = (matchingTags || []).map((t) => t.id);

      // Build forum query: title or content match OR has any of the matching tags
      let forumQuery = supabase
        .from("forums")
        .select(
          `
        id, title, content, created_at, user_id, subject_id, is_ai_verified,
        users:user_id (id, name, profile_url, school),
        subject:subject_id (id, name),
        upvotes_count, downvotes_count, comments_count
      `,
        )
        .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
        .limit(30);

      // If there are matching tags, also include forums that have those tags
      if (tagIds.length > 0) {
        // We need to union two sets: forums matching text, and forums matching tags.
        // Supabase doesn't have UNION, so we'll get forums matching tags separately,
        // then merge in JS.
        const { data: tagForums } = await supabase
          .from("forum_tags")
          .select("forum_id")
          .in("tag_id", tagIds);
        const tagForumIds = (tagForums || []).map((ft) => ft.forum_id);

        // Get forums by text
        const { data: textForums } = await forumQuery;
        const textForumIds = (textForums || []).map((f) => f.id);

        // Combine IDs
        const allForumIds = [...new Set([...textForumIds, ...tagForumIds])];
        if (allForumIds.length === 0) {
          // no forums
          forumQuery = null;
        } else {
          // Fetch all forums that are in the combined set
          const { data: combinedForums } = await supabase
            .from("forums")
            .select(
              `
            id, title, content, created_at, user_id, subject_id, is_ai_verified,
            users:user_id (id, name, profile_url, school),
            subject:subject_id (id, name),
            upvotes_count, downvotes_count, comments_count
          `,
            )
            .in("id", allForumIds);
          forumQuery = combinedForums;
        }
      } else {
        // only text match
        const { data: forumsData } = await forumQuery;
        forumQuery = forumsData;
      }

      const forumsData = forumQuery || [];

      // Fetch tags for each forum (optional but nice)
      const forumIds = forumsData.map((f) => f.id);
      let tagsByForum = {};
      if (forumIds.length > 0) {
        const { data: forumTags } = await supabase
          .from("forum_tags")
          .select("forum_id, tags(id, name)")
          .in("forum_id", forumIds);
        tagsByForum = forumTags.reduce((acc, ft) => {
          if (!acc[ft.forum_id]) acc[ft.forum_id] = [];
          acc[ft.forum_id].push(ft.tags);
          return acc;
        }, {});
      }

      // Format forums for frontend
      const formattedForums = (forumsData || []).map((forum) => ({
        id: forum.id,
        user_id: forum.user_id,
        title: forum.title,
        content: forum.content,
        author: forum.users?.name || "Unknown",
        authorInitials: getInitials(forum.users?.name),
        authorProfileUrl: forum.users?.profile_url,
        authorSchool: forum.users?.school,
        field: forum.subject?.name || "General",
        tags: tagsByForum[forum.id] || [],
        upvotes: forum.upvotes_count || 0,
        downvotes: forum.downvotes_count || 0,
        comments: forum.comments_count || 0,
        userVoteState: null, // we can fetch later if needed
        isSaved: false,
        isVerified: true,
        isAiVerified: forum.is_ai_verified || false,
        preview:
          (forum.content || "").substring(0, 150) +
          ((forum.content || "").length > 150 ? "..." : ""),
        fullContent: forum.content || "",
        created_at: forum.created_at,
      }));

      // ------------------------------
      // 3. Subjects
      // ------------------------------
      const { data: subjects, error: subjectsErr } = await supabase
        .from("subjects")
        .select("id, name")
        .ilike("name", `%${searchTerm}%`)
        .limit(10);
      if (subjectsErr) throw subjectsErr;

      // ------------------------------
      // 4. Tags
      // ------------------------------
      const { data: tags, error: tagsErr } = await supabase
        .from("tags")
        .select("id, name")
        .ilike("name", `%${searchTerm}%`)
        .limit(10);
      if (tagsErr) throw tagsErr;

      // Send results in priority order (already grouped)
      res.json({
        users: usersWithFollow,
        forums: formattedForums,
        subjects: subjects || [],
        tags: tags || [],
      });
    } catch (err) {
      console.error("Search error:", err);
      res.status(500).json({ error: "Search failed" });
    }
  },
};
