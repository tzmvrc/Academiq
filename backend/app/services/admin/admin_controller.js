import { supabase } from "../../database/supabase.js";
import { UserModel } from "../../models/user_model.js";
import { ForumModel } from "../../models/forum_model.js";

export const AdminController = {
  // ========== STATS ==========
  async getStats(req, res) {
    try {
      // Total users
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("*", { count: "exact" });

      const totalUsers = usersData?.length || 0;

      // Users per school
      const { data: schoolStats } = await supabase
        .from("users")
        .select("school");

      const usersBySchool = {};
      schoolStats?.forEach((user) => {
        const school = user.school || "No School";
        usersBySchool[school] = (usersBySchool[school] || 0) + 1;
      });

      // Forums per school
      const { data: forumStats } = await supabase
        .from("forums")
        .select("user_id")
        .eq("validation_status", "approved");

      const { data: forumUsers } = await supabase
        .from("users")
        .select("id, school");

      const forumsBySchool = {};
      forumStats?.forEach((forum) => {
        const user = forumUsers?.find((u) => u.id === forum.user_id);
        const school = user?.school || "No School";
        forumsBySchool[school] = (forumsBySchool[school] || 0) + 1;
      });

      // User activities
      const { data: forums } = await supabase
        .from("forums")
        .select("views_count");

      const totalViews =
        forums?.reduce((sum, f) => sum + (f.views_count || 0), 0) || 0;

      const { data: comments } = await supabase
        .from("comments")
        .select("*", { count: "exact" });

      const { data: upvotes } = await supabase
        .from("upvotes")
        .select("*", { count: "exact" });

      res.json({
        totalUsers,
        usersBySchool,
        forumsBySchool,
        userActivities: {
          views: totalViews,
          votes: upvotes?.length || 0,
          comments: comments?.length || 0,
        },
      });
    } catch (error) {
      console.error("Failed to get stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  },

  // ========== USERS ==========
  async getUsers(req, res) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .neq("role", "admin")
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json({
        users: data.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          profile_url: user.profile_url,
          school: user.school,
          role: user.role,
          points: user.points || 0,
          followers_count: user.followers_count || 0,
          following_count: user.following_count || 0,
          bio: user.bio,
        })),
      });
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },

  async getUser(req, res) {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: "User not found" });

      res.json(data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  },

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { name, points, profile_url, bio } = req.body;

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (points !== undefined) updateData.points = points;
      if (profile_url !== undefined) updateData.profile_url = profile_url;
      if (bio !== undefined) updateData.bio = bio;

      const { data, error } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error("Failed to update user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  },

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      const { error } = await supabase.from("users").delete().eq("id", id);

      if (error) throw error;

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  },

  async setUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!["user", "moderator", "admin"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const { data, error } = await supabase
        .from("users")
        .update({ role })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      res.json({ message: "User role updated successfully", user: data });
    } catch (error) {
      console.error("Failed to set user role:", error);
      res.status(500).json({ error: "Failed to set user role" });
    }
  },

  async getUserActivities(req, res) {
    try {
      const { id } = req.params;

      // Get user's forums
      const { data: forums, error: forumsError } = await supabase
        .from("forums")
        .select("id")
        .eq("user_id", id);

      const forums_count = forums?.length || 0;

      // Get total views for user's forums
      const { data: forumsData } = await supabase
        .from("forums")
        .select("views_count")
        .eq("user_id", id);

      const views_count =
        forumsData?.reduce((sum, f) => sum + (f.views_count || 0), 0) || 0;

      // Get user's upvotes
      const { data: upvotes } = await supabase
        .from("upvotes")
        .select("*", { count: "exact" })
        .eq("user_id", id);

      const votes_count = upvotes?.length || 0;

      // Get user's comments
      const { data: comments } = await supabase
        .from("comments")
        .select("*", { count: "exact" })
        .eq("user_id", id);

      const comments_count = comments?.length || 0;

      res.json({
        user_id: id,
        forums_count,
        views_count,
        votes_count,
        comments_count,
      });
    } catch (error) {
      console.error("Failed to fetch user activities:", error);
      res.status(500).json({ error: "Failed to fetch user activities" });
    }
  },

  // ========== FORUMS ==========
  async getForums(req, res) {
    try {
      const { data, error } = await supabase
        .from("forums")
        .select(
          `
          *,
          user:user_id(id, name, profile_url, school),
          subject:subject_id(id, name)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      res.json({
        forums: data.map((forum) => ({
          id: forum.id,
          title: forum.title,
          content: forum.content,
          subject: forum.subject,
          upvotes_count: forum.upvotes_count || 0,
          comments_count: forum.comments_count || 0,
          views_count: forum.views_count || 0,
          created_at: forum.created_at,
          user: forum.user,
          validation_status: forum.validation_status,
        })),
      });
    } catch (error) {
      console.error("Failed to fetch forums:", error);
      res.status(500).json({ error: "Failed to fetch forums" });
    }
  },

  async getForum(req, res) {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from("forums")
        .select(
          `
          *,
          user:user_id(id, name, profile_url, school),
          subject:subject_id(id, name)
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error("Failed to fetch forum:", error);
      res.status(500).json({ error: "Failed to fetch forum" });
    }
  },

  async updateForum(req, res) {
    try {
      const { id } = req.params;
      const { title, content, upvotes_count, validation_status } = req.body;

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (upvotes_count !== undefined) updateData.upvotes_count = upvotes_count;
      if (validation_status !== undefined)
        updateData.validation_status = validation_status;

      const { data, error } = await supabase
        .from("forums")
        .update(updateData)
        .eq("id", id)
        .select(
          `
          *,
          user:user_id(id, name, profile_url, school),
          subject:subject_id(id, name)
        `,
        )
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error("Failed to update forum:", error);
      res.status(500).json({ error: "Failed to update forum" });
    }
  },

  async deleteForum(req, res) {
    try {
      const { id } = req.params;

      const { error } = await supabase.from("forums").delete().eq("id", id);

      if (error) throw error;

      res.json({ message: "Forum deleted successfully" });
    } catch (error) {
      console.error("Failed to delete forum:", error);
      res.status(500).json({ error: "Failed to delete forum" });
    }
  },

  // ========== COMMENTS ==========
  async updateComment(req, res) {
    try {
      const { id } = req.params;
      const { upvotes_count } = req.body;

      const updateData = {};
      if (upvotes_count !== undefined) updateData.upvotes_count = upvotes_count;

      const { data, error } = await supabase
        .from("comments")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error("Failed to update comment:", error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  },

  async deleteComment(req, res) {
    try {
      const { id } = req.params;

      const { error } = await supabase.from("comments").delete().eq("id", id);

      if (error) throw error;

      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Failed to delete comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  },
};
