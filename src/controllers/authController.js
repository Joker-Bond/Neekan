import User from '../models/User.js';
import logger from '../utils/logger.js';
import { sendEmail } from '../utils/email.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'defaultsecret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';
  return jwt.sign({ id }, secret, { expiresIn });
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      const err = new Error('Name, email and password are required');
      err.status = 400;
      throw err;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const err = new Error('User with this email already exists');
      err.status = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    // Optionally send a welcome email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Octodock',
        text: `Hi ${user.name},\n\nThank you for registering at Octodock.`
      });
    } catch (emailErr) {
      logger.error('Failed to send welcome email', emailErr);
    }

    const token = generateToken(user._id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    logger.info(`User registered: ${user.email}`);
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.status = 400;
      throw err;
    }

    const user = await User.findOne({ email });
    if (!user) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.status = 401;
      throw err;
    }

    const token = generateToken(user._id);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    logger.info(`User logged in: ${user.email}`);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    // authMiddleware is expected to attach the user object to req.user
    if (!req.user) {
      const err = new Error('User not authenticated');
      err.status = 401;
      throw err;
    }
    res.json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (err) {
    next(err);
  }
};
