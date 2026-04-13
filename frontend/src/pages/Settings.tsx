import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { User, Lock, Palette, Upload, Eye, EyeOff } from "lucide-react";
import axiosInstance from "@/integration/axiosInstance";
import { toast } from "@/hooks/use-toast";

interface UserData {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  profile_url: string | null;
  password?: string;
  google_id?: string;
  privacy: string;
  theme?: string;
}

const Settings = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile section states
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  // Password section states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  // Theme section state
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Loading states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [, setSavingTheme] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user data on mount
  useEffect(() => {
    const loadUserData = () => {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setName(userData.name || "");
        setBio(userData.bio || "");
        setPrivacy(userData.privacy === "private" ? "private" : "public");
        setProfilePreview(userData.profile_url);
        setTheme(userData.theme || "light");
      }
      setLoading(false);
    };

    loadUserData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSavingProfile(true);
    try {
      let profileUrl = user.profile_url;

      // Upload profile picture if changed
      if (profilePicture) {
        const formData = new FormData();
        formData.append("profile_picture", profilePicture);
        const uploadRes = await axiosInstance.post(
          "/profile/upload-picture",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        profileUrl = uploadRes.data.profile_url;
      }

      // Update profile
      const updateRes = await axiosInstance.put("/profile", {
        name: name.trim() || null,
        bio: bio.trim() || null,
        profile_url: profileUrl,
        privacy,
      });

      const updatedUser = {
        ...updateRes.data.user,
        privacy: updateRes.data.user.privacy || privacy,
      };

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setProfilePicture(null);

      toast({ title: "Profile updated successfully!" });
    } catch (err) {
      console.error("Failed to update profile:", err);
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }

    // For manual signup users, current password is required
    const isManualSignup = user?.password && !user?.google_id;
    if (isManualSignup && !currentPassword) {
      toast({
        title: "Current password required",
        description: "Please enter your current password",
        variant: "destructive",
      });
      return;
    }

    setSavingPassword(true);
    try {
      await axiosInstance.put("/auth/change-password", {
        currentPassword: isManualSignup ? currentPassword : undefined,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      const messageText = isManualSignup
        ? "Password changed successfully!"
        : "Password has been set successfully!";
      toast({ title: messageText });
    } catch (err) {
      console.error("Failed to change password:", err);
      toast({
        title: "Password update failed",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleChangeTheme = async (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    setSavingTheme(true);

    try {
      await axiosInstance.put("/auth/theme", { theme: newTheme });

      const updatedUser = { ...user, theme: newTheme } as UserData;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Apply theme to document
      applyTheme(newTheme);

      toast({
        title: `Theme changed to ${newTheme} mode`,
      });
    } catch (err) {
      console.error("Failed to change theme:", err);
      toast({
        title: "Theme update failed",
        variant: "destructive",
      });
      setTheme((user?.theme as "light" | "dark") || "light");
    } finally {
      setSavingTheme(false);
    }
  };

  const applyTheme = (newTheme: "light" | "dark") => {
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">Loading settings...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-muted-foreground">
            Please log in to access settings
          </div>
        </div>
      </div>
    );
  }

  const isManualSignup = user.password && !user.google_id;
  const isOAuthUser = user.google_id && !user.password;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-heading font-bold text-foreground mb-8">
          Settings
        </h1>

        {/* Profile Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Profile
            </h2>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            {/* Profile Picture */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">
                Profile Picture
              </label>
              <div className="flex items-center gap-4">
                {profilePreview && (
                  <img
                    src={profilePreview}
                    alt="Profile preview"
                    className="h-16 w-16 rounded-full object-cover border border-border"
                  />
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg bg-secondary/50 px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                  <Upload className="h-4 w-4" />
                  Upload Picture
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Username
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                placeholder="Enter your username"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 resize-none"
              />
            </div>

            {/* Privacy */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Profile Privacy
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setPrivacy("public")}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    privacy === "public"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}>
                  Public
                </button>
                <button
                  onClick={() => setPrivacy("private")}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    privacy === "private"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}>
                  Private
                </button>
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </section>

        {/* Password Section */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              {isManualSignup ? "Change Password" : "Set Password"}
            </h2>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            {isManualSignup && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                  />
                  <button
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showCurrentPwd ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                {isManualSignup ? "New" : ""} Password
              </label>
              <div className="relative">
                <input
                  type={showNewPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={`Enter ${isManualSignup ? "new" : ""} password`}
                  className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                />
                <button
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNewPwd ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 6 characters
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPwd ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                />
                <button
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showConfirmPwd ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {isOAuthUser && (
              <p className="text-xs text-amber-600/70 bg-amber-500/10 rounded px-3 py-2">
                You're currently using Google login. Setting a password will
                allow you to log in with email and password as well.
              </p>
            )}

            <button
              onClick={handleChangePassword}
              disabled={savingPassword}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {savingPassword
                ? "Saving..."
                : isManualSignup
                  ? "Change Password"
                  : "Set Password"}
            </button>
          </div>
        </section>

        {/* Theme Section */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Theme
            </h2>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground mb-4">
              Choose your preferred color theme
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleChangeTheme("light")}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  theme === "light"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}>
                ☀️ Light Mode
              </button>
              <button
                onClick={() => handleChangeTheme("dark")}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                  theme === "dark"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}>
                🌙 Dark Mode
              </button>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
};

export default Settings;
