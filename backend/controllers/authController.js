import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import ActivityLog from '../models/ActivityLog.js';

// Helper to generate access and refresh tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Private/Admin
export const registerUser = async (req, res) => {
  const { username, email, password, role, fullName, designation, department, phone, employeeId } = req.body;

  try {
    // Validate role — only Admin and Auditor allowed
    if (role && !['Admin', 'Auditor'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Only Admin or Auditor roles are permitted.' });
    }

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }

    const user = await User.create({
      username,
      email,
      password,
      role,
      profile: {
        fullName: fullName || '',
        designation: designation || '',
        department: department || '',
        phone: phone || '',
        employeeId: employeeId || '',
      },
    });

    if (user) {
      // Log Activity
      await ActivityLog.create({
        user: user._id,
        action: 'REGISTER_USER',
        details: `Registered new user: ${username} (${role})`,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || '',
      });

      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  const { username, password, role } = req.body;

  try {
    const user = await User.findOne({ username }).select('+password');

    if (user && (await user.matchPassword(password))) {
      // Role checking
      // Validate requested role — only Admin and Auditor allowed
      if (role && !['Admin', 'Auditor'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Only Admin or Auditor roles are permitted.' });
      }
      if (role && user.role !== role) {
        return res.status(403).json({ message: `Access denied. You logged in as ${role} but your account is ${user.role}.` });
      }

      const { accessToken, refreshToken } = generateTokens(user._id);

      user.refreshToken = refreshToken;
      user.isOnline = true;
      user.lastActive = new Date();
      await user.save();

      // Log Activity
      await ActivityLog.create({
        user: user._id,
        action: 'LOGIN',
        details: `User logged in: ${username}`,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || '',
      });

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        accessToken,
        refreshToken,
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    res.status(401).json({ message: 'Refresh token expired or invalid' });
  }
};

// @desc    Logout user / clear tokens
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshToken = '';
      user.isOnline = false;
      user.lastActive = new Date();
      await user.save();

      // Log Activity
      await ActivityLog.create({
        user: user._id,
        action: 'LOGOUT',
        details: `User logged out: ${user.username}`,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || '',
      });
    }
    res.status(200).json({ message: 'Successfully logged out' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.email = req.body.email || user.email;
      if (req.body.profile) {
        user.profile.fullName = req.body.profile.fullName || user.profile.fullName;
        user.profile.designation = req.body.profile.designation || user.profile.designation;
        user.profile.department = req.body.profile.department || user.profile.department;
        user.profile.phone = req.body.profile.phone || user.profile.phone;
      }
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        profile: updatedUser.profile,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users (for Admin dashboard management)
// @route   GET /api/auth/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-refreshToken');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot/Reset Password simulation (ERP style)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }
    // Simulate sending email reset link
    res.json({ message: 'Password reset link sent to your registered email address.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset Password with token (ERP style)
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password reset successful. You can log in now.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
