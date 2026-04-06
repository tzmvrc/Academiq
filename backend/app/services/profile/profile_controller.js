import path from "path";
import { supabase } from "../../database/supabase.js";
import { findById, update } from "../../models/profile_model.js";
import { UserModel } from "../../models/user_model.js";
import { UserSettingsModel } from "../../models/userSettings_model.js";

const PROFILE_PIC_BUCKET = "profile_pic";

const slugifyFileName = (name = "profile") => {
  return name
    .replace(/\.[^/.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

// Renamed helper to avoid conflict
const uploadProfilePictureToStorage = async (file, userId) => {
  if (!file) return null;

  const ext = path.extname(file.originalname || "").toLowerCase();
  const baseName = slugifyFileName(file.originalname || "profile");
  const filePath = `users/${userId}/${Date.now()}-${baseName}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_PIC_BUCKET)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage
    .from(PROFILE_PIC_BUCKET)
    .getPublicUrl(filePath);

  return publicUrlData?.publicUrl || null;
};

// ========== Original methods (keep as is, but modify getUserProfile to include privacy) ==========
export const getUserProfile = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  const { data, error } = await findById(id);

  if (error || !data) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  // Get privacy setting
  const settings = await UserSettingsModel.getOrCreate(id);
  const privacy = settings.profile_privacy;

  const { name, bio, profile_url, school, followers_count, following_count, points } = data;

  return res.status(200).json({
    success: true,
    data: { id, name, bio, profile_url, school, followers_count, following_count, points, privacy },
  });
};

export const updateUserProfile = async (req, res) => {
  const { id } = req.params;
  const { name, bio, profile_url, school } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  const allowedFields = { name, bio, profile_url, school };
  const updates = Object.fromEntries(
    Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
  );

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });
  }

  const { data, error } = await update(id, updates);

  if (error || !data) {
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }

  // Get privacy setting to include in response
  const settings = await UserSettingsModel.getOrCreate(id);
  const privacy = settings.profile_privacy;

  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: {
      id,
      name: data.name,
      bio: data.bio,
      profile_url: data.profile_url,
      school: data.school,
      privacy,
    },
  });
};

export const getUserStats = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  const { data, error } = await findById(id);

  if (error || !data) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const { followers_count, following_count, points } = data;

  return res.status(200).json({
    success: true,
    data: { id, followers_count, following_count, points },
  });
};

// ========== New endpoints for edit profile modal ==========
export const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const publicUrl = await uploadProfilePictureToStorage(req.file, userId);
    if (!publicUrl) {
      return res.status(500).json({ error: "Failed to upload image" });
    }

    // Update user's profile_url
    await UserModel.updateProfile(userId, { profile_url: publicUrl });

    res.json({ profile_url: publicUrl });
  } catch (err) {
    console.error("Upload profile picture error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
};

export const updateFullProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { bio, profile_url, privacy } = req.body;

    const updates = {};
    if (bio !== undefined) updates.bio = bio;
    if (profile_url !== undefined) updates.profile_url = profile_url;

    if (Object.keys(updates).length > 0) {
      await UserModel.updateProfile(userId, updates);
    }

    if (privacy !== undefined) {
      await UserSettingsModel.updatePrivacy(userId, privacy);
    }

    // Fetch updated user and settings
    const updatedUser = await UserModel.findById(userId);
    const settings = await UserSettingsModel.getOrCreate(userId);

    res.json({
      user: {
        ...updatedUser,
        privacy: settings.profile_privacy,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Update failed" });
  }
};