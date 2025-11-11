import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// Helper to create an error with status code
const createError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/**
 * @desc    Get profile of logged‑in user
 * @route   GET /api/users/profile
 * @access  Private (user)
 */
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return next(createError(404, 'User not found'));
    }
    res.json(user);
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    next(error);
  }
};

/**
 * @desc    Update profile of logged‑in user
 * @route   PUT /api/users/profile
 * @access  Private (user)
 */
export const updateUserProfile = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(createError(404, 'User not found'));
    }
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    await user.save();
    const { password: _, ...updatedUser } = user.toObject();
    res.json(updatedUser);
  } catch (error) {
    logger.error('Error updating user profile:', error);
    // Duplicate email handling
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return next(createError(400, 'Email already in use'));
    }
    next(error);
  }
};

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    logger.error('Error fetching all users:', error);
    next(error);
  }
};

/**
 * @desc    Get user by ID (admin only)
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return next(createError(404, 'User not found'));
    }
    res.json(user);
  } catch (error) {
    logger.error(`Error fetching user ${req.params.id}:`, error);
    next(error);
  }
};

/**
 * @desc    Delete a user (admin only)
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(createError(404, 'User not found'));
    }
    await user.remove();
    res.json({ message: 'User removed' });
  } catch (error) {
    logger.error(`Error deleting user ${req.params.id}:`, error);
    next(error);
  }
};

export default {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  getUserById,
  deleteUser,
};