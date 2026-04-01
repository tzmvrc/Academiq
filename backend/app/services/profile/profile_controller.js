import { findById, update } from '../../models/profile_model.js';
export const getUserProfile = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ success: false, message: 'User ID is required.' });
  }

  const { data, error } = await findById(id);

  if (error || !data) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const { name, bio, profile_url, school, followers_count, following_count, points } = data;

  return res.status(200).json({
    success: true,
    data: { id, name, bio, profile_url, school, followers_count, following_count, points },
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

  return res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: {
      id,
      name: data.name,
      bio: data.bio,
      profile_url: data.profile_url,
      school: data.school,
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