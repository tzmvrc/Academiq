// components/EditProfileModal.tsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Globe, Lock, Trophy, Check } from "lucide-react";
import axiosInstance from "@/integration/axiosInstance";
import { toast } from "@/hooks/use-toast";

interface Achievement {
  id: string;
  achievement_id: string;
  achievement_name: string;
  achievement_description: string;
  achievement_icon: string;
  achievement_points: number;
  unlocked_at: string;
  is_featured: boolean;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    bio: string | null;
    profile_url: string | null;
    privacy: string; // 'public' or 'private'
  };
  onUpdate: (updatedUser: any) => void;
}

const EditProfileModal = ({
  isOpen,
  onClose,
  user,
  onUpdate,
}: EditProfileModalProps) => {
  const [bio, setBio] = useState(user.bio || "");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(
    user.profile_url,
  );
  const [privacy, setPrivacy] = useState<"public" | "private">(
    (user.privacy === "private" ? "private" : "public") as "public" | "private",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedFeatured, setSelectedFeatured] = useState<string[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when modal opens with new user data
  useEffect(() => {
    if (isOpen) {
      setBio(user.bio || "");
      setProfilePreview(user.profile_url);
      const privacySetting = user.privacy === "private" ? "private" : "public";
      setPrivacy(privacySetting as "public" | "private");
      setProfilePicture(null);
      fetchAchievements();
    }
  }, [isOpen, user.bio, user.profile_url, user.privacy, user.id]);

  const fetchAchievements = async () => {
    try {
      setLoadingAchievements(true);
      const res = await axiosInstance.get(`/achievements/user/${user.id}`);
      const allAchievements = res.data.achievements || [];
      setAchievements(allAchievements);

      // Load featured achievements from localStorage
      const featuredKey = `featured_achievements_${user.id}`;
      const storedFeatured = localStorage.getItem(featuredKey);
      const featured = storedFeatured ? JSON.parse(storedFeatured) : [];
      setSelectedFeatured(featured);
    } catch (err) {
      console.error("Failed to fetch achievements", err);
      // Silently fail - achievements section just won't show achievements
      // This prevents the entire modal from breaking if achievements aren't available
      setAchievements([]);
    } finally {
      setLoadingAchievements(false);
    }
  };

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

  const toggleFeaturedAchievement = (achievementId: string) => {
    setSelectedFeatured((prev) => {
      if (prev.includes(achievementId)) {
        return prev.filter((id) => id !== achievementId);
      } else {
        if (prev.length >= 3) {
          toast({
            title: "Maximum 3 featured achievements allowed",
            variant: "destructive",
          });
          return prev;
        }
        return [...prev, achievementId];
      }
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      let profileUrl = user.profile_url;
      if (profilePicture) {
        // Upload profile picture
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
        bio: bio.trim() || null,
        profile_url: profileUrl,
        privacy,
      });

      // Update featured achievements (save to backend)
      if (
        selectedFeatured.length > 0 ||
        achievements.some((a) => a.is_featured)
      ) {
        await axiosInstance.put("/achievements/featured", {
          featuredIds: selectedFeatured,
        });
      }

      // Save featured achievements to localStorage for immediate display
      if (selectedFeatured.length > 0) {
        localStorage.setItem(
          `featured_achievements_${user.id}`,
          JSON.stringify(selectedFeatured),
        );
      } else {
        localStorage.removeItem(`featured_achievements_${user.id}`);
      }

      // Ensure the returned user includes privacy field
      const updatedUserData = {
        ...updateRes.data.user,
        privacy: updateRes.data.user.privacy || privacy,
      };

      toast({ title: "Profile updated successfully!" });
      onUpdate(updatedUserData); // pass updated user data back to parent
      onClose();
    } catch (err) {
      console.error("Failed to update profile:", err);
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={onClose}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-lg bg-card rounded-xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-heading font-semibold text-foreground">
                Edit Profile
              </h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-secondary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                    {profilePreview ? (
                      <img
                        src={profilePreview}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-primary">
                        {user.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80">
                    <Upload className="h-4 w-4" /> Upload
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

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="Tell us about yourself... You can include links (they will be clickable)"
                  className="w-full rounded-lg border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Supports plain text and clickable URLs.
                </p>
              </div>

              {/* Privacy Setting */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Profile Privacy
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setPrivacy("public")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      privacy === "public"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary"
                    }`}>
                    <Globe className="h-4 w-4" /> Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrivacy("private")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                      privacy === "private"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary"
                    }`}>
                    <Lock className="h-4 w-4" /> Private
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {privacy === "private"
                    ? "Only your followers can see your followers/following lists."
                    : "Anyone can see your followers and following lists."}
                </p>
              </div>

              {/* Featured Achievements */}
              {!loadingAchievements && achievements.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    Featured Achievements (top 3)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {achievements.map((achievement) => (
                      <button
                        key={achievement.achievement_id}
                        type="button"
                        onClick={() =>
                          toggleFeaturedAchievement(achievement.achievement_id)
                        }
                        className={`relative p-3 rounded-lg border-2 transition-all ${
                          selectedFeatured.includes(achievement.achievement_id)
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-primary/50"
                        }`}>
                        <div className="text-2xl text-center mb-1">
                          {achievement.achievement_icon || "🏆"}
                        </div>
                        <p className="text-xs font-medium text-foreground text-center line-clamp-1">
                          {achievement.achievement_name}
                        </p>
                        {selectedFeatured.includes(
                          achievement.achievement_id,
                        ) && (
                          <div className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Select your 3 best achievements to showcase on your profile
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t border-border">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {isLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EditProfileModal;
