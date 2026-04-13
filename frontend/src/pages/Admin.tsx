import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  BookOpen,
  TrendingUp,
  Search,
  Edit,
  X,
  Save,
  Trash2,
} from "lucide-react";
import axiosInstance from "@/integration/axiosInstance";
import { toast } from "@/hooks/use-toast";

// Types
interface User {
  id: string;
  name: string;
  email: string;
  profile_url: string | null;
  school: string | null;
  role: string;
  points: number;
  followers_count: number;
  following_count: number;
  bio: string | null;
  created_at?: string;
}

interface UserActivity {
  user_id: string;
  views_count: number;
  votes_count: number;
  comments_count: number;
  forums_count: number;
}

interface AdminStats {
  totalUsers: number;
  usersBySchool: Record<string, number>;
  forumsBySchool: Record<string, number>;
  userActivities: {
    views: number;
    votes: number;
    comments: number;
  };
}

interface Forum {
  id: string;
  title: string;
  content: string;
  subject: { name: string };
  upvotes_count: number;
  comments_count: number;
  views_count?: number;
  created_at: string;
  user?: { name: string };
}

interface Comment {
  id: string;
  content: string;
  upvotes_count: number;
  created_at: string;
  user?: { name: string };
}

type AdminTab = "dashboard" | "users" | "forums";

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [users, setUsers] = useState<User[]>([]);
  const [forums, setForums] = useState<Forum[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedForum, setSelectedForum] = useState<Forum | null>(null);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [editingForum, setEditingForum] = useState<Partial<Forum> | null>(null);
  const [forumComments, setForumComments] = useState<Comment[]>([]);
  const [userActivities, setUserActivities] = useState<
    Record<string, UserActivity>
  >({});
  const [deleteConfirmData, setDeleteConfirmData] = useState<{
    type: "user" | "forum";
    id: string;
    name: string;
  } | null>(null);

  // Check if user is admin on mount
  useEffect(() => {
    const checkAdminRole = () => {
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
          navigate("/login");
          return;
        }
        const user = JSON.parse(userStr);
        if (user.role !== "admin" && user.role !== "moderator") {
          toast({
            title: "Access Denied",
            description: "You do not have permission to access this page.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }
      } catch (error) {
        navigate("/login");
      }
    };
    checkAdminRole();
  }, [navigate]);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, forumsRes, statsRes] = await Promise.all([
          axiosInstance.get("/admin/users"),
          axiosInstance.get("/admin/forums"),
          axiosInstance.get("/admin/stats"),
        ]);

        setUsers(usersRes.data.users || []);
        setForums(forumsRes.data.forums || []);
        setStats(statsRes.data);

        // Fetch user activities for each user
        const activities: Record<string, UserActivity> = {};
        for (const user of usersRes.data.users) {
          try {
            const actRes = await axiosInstance.get(
              `/admin/users/${user.id}/activities`,
            );
            activities[user.id] = actRes.data;
          } catch (err) {
            console.log(`No activities found for user ${user.id}`);
          }
        }
        setUserActivities(activities);

        toast({
          title: "Failed to load data",
          description: "Could not fetch admin dashboard information.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Search and filter users
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users.slice(0, 8);
    const query = searchQuery.toLowerCase();
    return users
      .filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.school?.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [users, searchQuery]);

  // Fetch forum comments
  const fetchForumComments = useCallback(async (forumId: string) => {
    try {
      const res = await axiosInstance.get(`/forums/${forumId}/comments`);
      setForumComments(res.data.comments || []);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    }
  }, []);

  // Update user
  const updateUser = async () => {
    if (!editingUser || !selectedUser) return;

    try {
      await axiosInstance.patch(`/admin/users/${selectedUser.id}`, editingUser);
      setUsers(
        users.map((u) =>
          u.id === selectedUser.id ? { ...u, ...editingUser } : u,
        ),
      );
      setSelectedUser({ ...selectedUser, ...editingUser });
      setEditingUser(null);
      toast({
        title: "Success",
        description: "User updated successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to update user:", error);
      toast({
        title: "Update Failed",
        description: "Could not update user information.",
        variant: "destructive",
      });
    }
  };

  // Update forum
  const updateForum = async () => {
    if (!editingForum || !selectedForum) return;

    try {
      await axiosInstance.patch(
        `/admin/forums/${selectedForum.id}`,
        editingForum,
      );
      setForums(
        forums.map((f) =>
          f.id === selectedForum.id ? { ...f, ...editingForum } : f,
        ),
      );
      setSelectedForum({ ...selectedForum, ...editingForum });
      setEditingForum(null);
      toast({
        title: "Success",
        description: "Forum updated successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Failed to update forum:", error);
      toast({
        title: "Update Failed",
        description: "Could not update forum information.",
        variant: "destructive",
      });
    }
  };

  // Update comment
  const updateComment = async (commentId: string, points: number) => {
    try {
      await axiosInstance.patch(`/admin/comments/${commentId}`, {
        upvotes_count: points,
      });
      setForumComments(
        forumComments.map((c) =>
          c.id === commentId ? { ...c, upvotes_count: points } : c,
        ),
      );
      toast({
        title: "Success",
        description: "Comment points updated.",
      });
    } catch (error) {
      console.error("Failed to update comment:", error);
      toast({
        title: "Update Failed",
        variant: "destructive",
      });
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      setUsers(users.filter((u) => u.id !== userId));
      setSelectedUser(null);
      setDeleteConfirmData(null);
      toast({
        title: "Success",
        description: "User deleted successfully.",
      });
    } catch (error) {
      console.error("Failed to delete user:", error);
      toast({
        title: "Delete Failed",
        description: "Could not delete user.",
        variant: "destructive",
      });
    }
  };

  // Delete forum
  const deleteForum = async (forumId: string) => {
    try {
      await axiosInstance.delete(`/admin/forums/${forumId}`);
      setForums(forums.filter((f) => f.id !== forumId));
      setSelectedForum(null);
      setForumComments([]);
      setDeleteConfirmData(null);
      toast({
        title: "Success",
        description: "Forum deleted successfully.",
      });
    } catch (error) {
      console.error("Failed to delete forum:", error);
      toast({
        title: "Delete Failed",
        description: "Could not delete forum.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-muted-foreground">
              Loading admin dashboard...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage users, forums, and content
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-foreground"
                }`}>
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "users"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-foreground"
                }`}>
                Users
              </button>
              <button
                onClick={() => setActiveTab("forums")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === "forums"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-secondary text-foreground"
                }`}>
                Forums
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <AnimatePresence mode="wait">
          {/* Dashboard Tab */}
          {activeTab === "dashboard" && stats && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Users
                      </p>
                      <p className="text-3xl font-bold text-foreground mt-2">
                        {stats.totalUsers}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-primary/50" />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Forums
                      </p>
                      <p className="text-3xl font-bold text-foreground mt-2">
                        {forums.length}
                      </p>
                    </div>
                    <BookOpen className="h-8 w-8 text-primary/50" />
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        User Activities
                      </p>
                      <p className="text-2xl font-bold text-foreground mt-2">
                        {stats.userActivities.views +
                          stats.userActivities.votes +
                          stats.userActivities.comments}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Views: {stats.userActivities.views} | Votes:{" "}
                        {stats.userActivities.votes} | Comments:{" "}
                        {stats.userActivities.comments}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary/50" />
                  </div>
                </div>
              </div>

              {/* Schools Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold text-foreground mb-4">
                    Users Per School
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.usersBySchool).map(
                      ([school, count]) => (
                        <div
                          key={school}
                          className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {school || "No School"}
                          </span>
                          <span className="font-semibold text-foreground">
                            {count}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                  <h3 className="font-semibold text-foreground mb-4">
                    Forums Per School
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.forumsBySchool).map(
                      ([school, count]) => (
                        <div
                          key={school}
                          className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {school || "No School"}
                          </span>
                          <span className="font-semibold text-foreground">
                            {count}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Users Tab */}
          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users by name, email, or school..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-secondary/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* User Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedUser(user)}>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {user.profile_url ? (
                          <img
                            src={user.profile_url}
                            alt={user.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-semibold text-primary">
                            {user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">
                          {user.name}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {user.points} pts
                          </span>
                          <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded">
                            {user.school || "No school"}
                          </span>
                        </div>
                      </div>
                      <Edit className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </motion.div>
                ))}
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No users found</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Forums Tab */}
          {activeTab === "forums" && (
            <motion.div
              key="forums"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {forums.map((forum) => (
                  <motion.div
                    key={forum.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedForum(forum);
                      fetchForumComments(forum.id);
                    }}>
                    <h3 className="font-semibold text-foreground truncate">
                      {forum.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {forum.content}
                    </p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded">
                        {forum.subject.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        👍 {forum.upvotes_count}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        💬 {forum.comments_count}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(forum.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {forums.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No forums found</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setSelectedUser(null);
              setEditingUser(null);
            }}>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-xl border border-border bg-card max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">
                    User Details
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setEditingUser(null);
                    }}
                    className="p-1 hover:bg-secondary rounded">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Basic Info */}
                  <div className="rounded-lg bg-secondary/30 p-3 border border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-2">
                      Basic Information
                    </h3>
                    {/* Name */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Name
                      </label>
                      <input
                        type="text"
                        value={editingUser?.name || selectedUser.name}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            name: e.target.value,
                          })
                        }
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    {/* Email (read-only) */}
                    <div className="mt-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Email
                      </label>
                      <input
                        type="email"
                        value={selectedUser.email}
                        disabled
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary/30 text-muted-foreground text-sm cursor-not-allowed"
                      />
                    </div>

                    {/* School (read-only) */}
                    <div className="mt-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        School
                      </label>
                      <input
                        type="text"
                        value={selectedUser.school || "N/A"}
                        disabled
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary/30 text-muted-foreground text-sm cursor-not-allowed"
                      />
                    </div>

                    {/* Role (read-only) */}
                    <div className="mt-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Role
                      </label>
                      <input
                        type="text"
                        value={selectedUser.role}
                        disabled
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary/30 text-muted-foreground text-sm cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="rounded-lg bg-secondary/30 p-3 border border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-3">
                      Statistics
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded bg-background">
                        <p className="text-xs text-muted-foreground">Points</p>
                        <p className="text-lg font-bold text-primary">
                          {selectedUser.points}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-background">
                        <p className="text-xs text-muted-foreground">
                          Followers
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {selectedUser.followers_count}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-background">
                        <p className="text-xs text-muted-foreground">
                          Following
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {selectedUser.following_count}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-background">
                        <p className="text-xs text-muted-foreground">Bio</p>
                        <p className="text-xs text-foreground truncate">
                          {selectedUser.bio || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* User Activities */}
                  {userActivities[selectedUser.id] && (
                    <div className="rounded-lg bg-secondary/30 p-3 border border-border">
                      <h3 className="text-sm font-semibold text-foreground mb-3">
                        User Activities
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded bg-background">
                          <p className="text-xs text-muted-foreground">
                            Forums
                          </p>
                          <p className="text-lg font-bold text-primary">
                            {userActivities[selectedUser.id].forums_count}
                          </p>
                        </div>
                        <div className="p-2 rounded bg-background">
                          <p className="text-xs text-muted-foreground">Views</p>
                          <p className="text-lg font-bold text-accent">
                            {userActivities[selectedUser.id].views_count}
                          </p>
                        </div>
                        <div className="p-2 rounded bg-background">
                          <p className="text-xs text-muted-foreground">Votes</p>
                          <p className="text-lg font-bold text-accent">
                            {userActivities[selectedUser.id].votes_count}
                          </p>
                        </div>
                        <div className="p-2 rounded bg-background">
                          <p className="text-xs text-muted-foreground">
                            Comments
                          </p>
                          <p className="text-lg font-bold text-accent">
                            {userActivities[selectedUser.id].comments_count}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Editable Fields */}
                  <div className="rounded-lg bg-secondary/30 p-3 border border-border">
                    <h3 className="text-sm font-semibold text-foreground mb-2">
                      Edit Information
                    </h3>
                    {/* Points */}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Points
                      </label>
                      <input
                        type="number"
                        value={editingUser?.points || selectedUser.points}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            points: parseInt(e.target.value),
                          })
                        }
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    {/* Profile URL */}
                    <div className="mt-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Profile Image URL
                      </label>
                      <input
                        type="text"
                        value={
                          editingUser?.profile_url ||
                          selectedUser.profile_url ||
                          ""
                        }
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            profile_url: e.target.value,
                          })
                        }
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-border">
                  <button
                    onClick={updateUser}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
                    <Save className="h-4 w-4" />
                    Save Changes
                  </button>
                  <button
                    onClick={() =>
                      setDeleteConfirmData({
                        type: "user",
                        id: selectedUser.id,
                        name: selectedUser.name,
                      })
                    }
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setEditingUser(null);
                    }}
                    className="px-4 py-2 rounded-lg hover:bg-secondary transition-colors font-medium">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forum Detail Modal */}
      <AnimatePresence>
        {selectedForum && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setSelectedForum(null);
              setEditingForum(null);
              setForumComments([]);
            }}>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-xl border border-border bg-card max-w-3xl w-full max-h-96 overflow-y-auto">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">
                    Forum Details
                  </h2>
                  <button
                    onClick={() => {
                      setSelectedForum(null);
                      setEditingForum(null);
                      setForumComments([]);
                    }}
                    className="p-1 hover:bg-secondary rounded">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Forum Edit Section */}
                <div className="space-y-3 pb-4 border-b border-border">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Title
                    </label>
                    <input
                      type="text"
                      value={editingForum?.title || selectedForum.title}
                      onChange={(e) =>
                        setEditingForum({
                          ...editingForum,
                          title: e.target.value,
                        })
                      }
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Content
                    </label>
                    <textarea
                      value={editingForum?.content || selectedForum.content}
                      onChange={(e) =>
                        setEditingForum({
                          ...editingForum,
                          content: e.target.value,
                        })
                      }
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-24 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Upvotes
                    </label>
                    <input
                      type="number"
                      value={
                        editingForum?.upvotes_count ||
                        selectedForum.upvotes_count
                      }
                      onChange={(e) =>
                        setEditingForum({
                          ...editingForum,
                          upvotes_count: parseInt(e.target.value),
                        })
                      }
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  <button
                    onClick={updateForum}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
                    <Save className="h-4 w-4" />
                    Save Forum Changes
                  </button>

                  <button
                    onClick={() =>
                      setDeleteConfirmData({
                        type: "forum",
                        id: selectedForum.id,
                        name: selectedForum.title,
                      })
                    }
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium">
                    <Trash2 className="h-4 w-4" />
                    Delete Forum
                  </button>
                </div>

                {/* Comments Section */}
                <div>
                  <h3 className="font-semibold text-foreground mb-3">
                    Comments ({forumComments.length})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {forumComments.map((comment) => (
                      <div
                        key={comment.id}
                        className="p-3 rounded-lg bg-secondary/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">
                            {comment.user?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-sm text-foreground">
                          {comment.content}
                        </p>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-muted-foreground">
                            Points:
                          </label>
                          <input
                            type="number"
                            value={comment.upvotes_count}
                            onChange={(e) =>
                              updateComment(
                                comment.id,
                                parseInt(e.target.value),
                              )
                            }
                            className="w-16 px-2 py-1 rounded text-xs border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/20"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedForum(null);
                    setEditingForum(null);
                    setForumComments([]);
                  }}
                  className="w-full px-4 py-2 rounded-lg hover:bg-secondary transition-colors font-medium">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDeleteConfirmData(null)}>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-xl border border-border bg-card max-w-sm w-full p-6">
              <h2 className="text-lg font-bold text-foreground mb-2">
                Confirm Delete
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  {deleteConfirmData.name}
                </span>
                ? This action cannot be undone.
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (deleteConfirmData.type === "user") {
                      deleteUser(deleteConfirmData.id);
                    } else {
                      deleteForum(deleteConfirmData.id);
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors font-medium">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button
                  onClick={() => setDeleteConfirmData(null)}
                  className="flex-1 px-4 py-2 rounded-lg hover:bg-secondary transition-colors font-medium">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Admin;
