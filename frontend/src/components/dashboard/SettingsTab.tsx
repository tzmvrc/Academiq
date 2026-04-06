import React, { useState } from "react";
import { BrutalCard } from "@/components/ui/BrutalCard";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalInput } from "@/components/ui/BrutalInput";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, Lock, Bell, Save } from "lucide-react";

export const SettingsTab: React.FC = () => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification preferences
  const [notifyNewPosts, setNotifyNewPosts] = useState(true);
  const [notifyComments, setNotifyComments] = useState(true);
  const [notifyPoints, setNotifyPoints] = useState(false);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = () => {
    if (newPassword !== confirmPassword) {
      alert("New passwords do not match!");
      return;
    }
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters!");
      return;
    }
    // TODO: Implement actual password change with backend
    alert("Password changed successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSaveNotifications = () => {
    // TODO: Save notification preferences to backend
    alert("Notification preferences saved!");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-3xl font-bold">Settings</h1>

      {/* Avatar Upload Section */}
      <BrutalCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Camera className="w-6 h-6" />
          <h2 className="text-xl font-bold">Profile Picture</h2>
        </div>

        <div className="flex items-center gap-6">
          {/* Avatar Preview */}
          <div className="relative">
            <div className="w-24 h-24 bg-muted rounded-xl border-[3px] border-foreground shadow-brutal overflow-hidden flex items-center justify-center">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl font-bold text-muted-foreground">
                  ?
                </span>
              )}
            </div>
          </div>

          {/* Upload Controls */}
          <div className="flex-1">
            <p className="text-muted-foreground mb-3">
              Upload a new profile picture. Recommended size: 200x200px.
            </p>
            <label className="inline-block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground font-semibold border-[3px] border-foreground rounded-lg shadow-brutal hover:shadow-brutal-lg active:shadow-none transition-all">
                <Camera className="w-4 h-4" />
                Upload Image
              </span>
            </label>
          </div>
        </div>
      </BrutalCard>

      {/* Change Password Section */}
      <BrutalCard color="yellow" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="w-6 h-6" />
          <h2 className="text-xl font-bold">Change Password</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-semibold mb-2">Current Password</label>
            <BrutalInput
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">New Password</label>
            <BrutalInput
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 8 characters)"
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">
              Confirm New Password
            </label>
            <BrutalInput
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <BrutalButton onClick={handlePasswordChange}>
            <Lock className="w-4 h-4 mr-2" />
            Update Password
          </BrutalButton>
        </div>
      </BrutalCard>

      {/* Email Notification Preferences */}
      <BrutalCard color="teal" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-6 h-6" />
          <h2 className="text-xl font-bold">Email Notifications</h2>
        </div>

        <p className="text-muted-foreground mb-4">
          Choose which email notifications you'd like to receive.
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border-[2px] border-foreground cursor-pointer hover:bg-background transition-colors">
            <Checkbox
              checked={notifyNewPosts}
              onCheckedChange={(checked) =>
                setNotifyNewPosts(checked as boolean)
              }
              className="w-5 h-5"
            />
            <div>
              <span className="font-semibold">New Posts</span>
              <p className="text-sm text-muted-foreground">
                Get notified when there are new posts in your interests
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border-[2px] border-foreground cursor-pointer hover:bg-background transition-colors">
            <Checkbox
              checked={notifyComments}
              onCheckedChange={(checked) =>
                setNotifyComments(checked as boolean)
              }
              className="w-5 h-5"
            />
            <div>
              <span className="font-semibold">Comments</span>
              <p className="text-sm text-muted-foreground">
                Get notified when someone comments on your posts
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border-[2px] border-foreground cursor-pointer hover:bg-background transition-colors">
            <Checkbox
              checked={notifyPoints}
              onCheckedChange={(checked) => setNotifyPoints(checked as boolean)}
              className="w-5 h-5"
            />
            <div>
              <span className="font-semibold">Points & Rewards</span>
              <p className="text-sm text-muted-foreground">
                Get notified when you earn points or achieve new ranks
              </p>
            </div>
          </label>
        </div>

        <div className="mt-5">
          <BrutalButton variant="primary" onClick={handleSaveNotifications}>
            <Save className="w-4 h-4 mr-2" />
            Save Preferences
          </BrutalButton>
        </div>
      </BrutalCard>
    </div>
  );
};
