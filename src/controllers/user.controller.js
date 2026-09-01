const User = require('../models/user.model');
const Subscription = require('../models/subscription.model');
const Plan = require('../models/plan.model');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const generateLicenseKey = () => {
  return 'SMM-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/SuperAdmin
exports.getUsers = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'ADMIN') {
      query.createdByAdminId = req.user._id;
    } else if (req.user.role === 'USER') {
      query._id = req.user._id;
    }

    // Apply Filters
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { username: searchRegex },
        { email: searchRegex },
        { name: searchRegex }
      ];
    }
    if (req.query.adminId && req.user.role === 'SUPER_ADMIN') {
      query.createdByAdminId = req.query.adminId;
    }
    if (req.query.status && req.query.status !== 'All') {
      query.status = req.query.status;
    }

    // Handle Subscription Plan filtering
    if (req.query.planId && req.query.planId !== 'All') {
      const subscriptions = await Subscription.find({ planId: req.query.planId }).select('_id');
      query.subscriptionId = { $in: subscriptions.map(sub => sub._id) };
    }

    // Sorting
    const sort = {};
    if (req.query.sortBy) {
      sort[req.query.sortBy] = req.query.order === 'asc' ? 1 : -1;
    } else {
      sort.registeredAt = -1; // Default
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 1000;
    const skip = (page - 1) * limit;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .populate({ path: 'subscriptionId', populate: { path: 'planId' } })
      .sort(sort)
      .skip(skip)
      .limit(limit);

    res.json({
      data: users,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/SuperAdmin
exports.getUserById = async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user.role === 'ADMIN') {
      query.createdByAdminId = req.user._id;
    } else if (req.user.role === 'USER') {
      query._id = req.user._id;
    }

    const user = await User.findOne(query).populate({
      path: 'subscriptionId',
      populate: { path: 'planId' }
    });
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found or access denied' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create user (Assigns plan and generates license)
// @route   POST /api/users
// @access  Private/SuperAdmin
const getIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
const getDevice = (req) => (req.headers['user-agent'] || '').substring(0, 120);

exports.createUser = async (req, res) => {
  const { username, email, password, role, planId, status, profilePicture, allocatedCredits, allocatedPosts, allocatedStorage, allocatedPlatforms, notes, brandLogo } = req.body;

  try {
    const GlobalSetting = require('../models/globalSetting.model');
    let settings = await GlobalSetting.findOne({ configId: 'global_config' });

    if (req.user.role === 'ADMIN' && settings?.userAndAccount?.adminCreatedUserEnabled === false) {
      return res.status(403).json({ message: 'User creation by Admins is currently disabled by Super Admin.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const licenseKey = generateLicenseKey();
    const now = new Date();

    // Limit check if creator is an ADMIN
    if (req.user.role === 'ADMIN') {
      const admin = await User.findById(req.user._id);
      
      const requestedCredits = parseInt(allocatedCredits) || 0;
      const requestedPosts = parseInt(allocatedPosts) || 0;
      const requestedStorage = parseInt(allocatedStorage) || 0;

      const availableCredits = (admin.allocatedCredits || 0) - (admin.distributedCredits || 0);
      const availablePosts = (admin.allocatedPosts || 0) - (admin.distributedPosts || 0);
      const availableStorage = (admin.allocatedStorage || 0) - (admin.distributedStorage || 0);

      if (requestedCredits > availableCredits) return res.status(400).json({ message: `Insufficient AI credits. You have ${availableCredits} available.` });
      if (requestedPosts > availablePosts) return res.status(400).json({ message: `Insufficient Post credits. You have ${availablePosts} available.` });
      if (requestedStorage > availableStorage) return res.status(400).json({ message: `Insufficient Storage. You have ${availableStorage} GB available.` });

      // Deduct from Admin's available pool by increasing distributed
      admin.distributedCredits = (admin.distributedCredits || 0) + requestedCredits;
      admin.distributedPosts = (admin.distributedPosts || 0) + requestedPosts;
      admin.distributedStorage = (admin.distributedStorage || 0) + requestedStorage;
      
      await admin.save();

      // Platform Allocation Validation
      if (allocatedPlatforms && Array.isArray(allocatedPlatforms)) {
        const adminPlatforms = admin.allocatedPlatforms || [];
        const invalidPlatforms = allocatedPlatforms.filter(p => !adminPlatforms.includes(p));
        if (invalidPlatforms.length > 0) {
          return res.status(400).json({ message: `You cannot assign platforms you do not have access to: ${invalidPlatforms.join(', ')}` });
        }
      }
    }

    const user = await User.create({
      username,
      email,
      password,
      role: role || 'USER',
      status: status || 'ACTIVE',
      profilePicture,
      licenseKey,
      registrationMethod: 'CREATED_BY_ADMIN',
      registeredAt: now,
      createdByAdminId: req.user._id,
      assignedAdminId: req.user.role === 'ADMIN' ? req.user._id : (req.user.role === 'SUPER_ADMIN' && req.body.assignedAdminId ? req.body.assignedAdminId : null),
      ipAddress: getIp(req),
      deviceInfo: getDevice(req),
      allocatedCredits: parseInt(allocatedCredits) || 0,
      allocatedPosts: parseInt(allocatedPosts) || 0,
      allocatedStorage: parseInt(allocatedStorage) || 0,
      allocatedPlatforms: allocatedPlatforms || ['instagram', 'facebook', 'linkedin', 'youtube', 'twitter', 'threads', 'pinterest', 'whatsapp', 'tiktok', 'discord', 'slack', 'telegram', 'canva', 'reddit'],
      notes: notes || '',
      brandLogo: brandLogo || '',
    });

    if (planId) {
      const plan = await Plan.findById(planId);
      if (plan) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + plan.durationDays);

        const subscription = await Subscription.create({
          userId: user._id,
          planId: plan._id,
          endDate
        });

        user.subscriptionId = subscription._id;
        await user.save();
      }
    }

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/SuperAdmin
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      if (req.user.role === 'ADMIN' && user.createdByAdminId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden: You do not manage this user' });
      }

      user.username = req.body.username || user.username;
      user.email = req.body.email || user.email;
      user.role = req.body.role || user.role;
      user.profilePicture = req.body.profilePicture || user.profilePicture;
      if (req.body.brandLogo !== undefined) {
        user.brandLogo = req.body.brandLogo;
      }
      
      // Handle Platform Allocation Update
      if (req.body.allocatedPlatforms !== undefined) {
        if (req.user.role === 'ADMIN') {
          const admin = await User.findById(req.user._id);
          const adminPlatforms = admin.allocatedPlatforms || [];
          const invalidPlatforms = req.body.allocatedPlatforms.filter(p => !adminPlatforms.includes(p));
          if (invalidPlatforms.length > 0) {
            return res.status(400).json({ message: `You cannot assign platforms you do not have access to: ${invalidPlatforms.join(', ')}` });
          }
        }
        user.allocatedPlatforms = req.body.allocatedPlatforms;
      }

      if (req.body.status) {
        user.status = req.body.status;
      }

      // Handle Feature Permissions and Plan Overrides
      if (req.body.featurePermissions !== undefined) {
        // Only SUPER_ADMIN or authorized ADMIN can modify features
        // If Admin, they cannot grant features they don't have.
        // We will do a basic merge for now. Deep permission checking is handled in middleware for usage.
        user.featurePermissions = {
          ...user.featurePermissions,
          ...req.body.featurePermissions
        };
      }

      if (req.body.planOverrides !== undefined) {
        user.planOverrides = {
          ...user.planOverrides,
          ...req.body.planOverrides
        };
      }

      // Handle Plan change
      if (req.body.planId !== undefined) {
        if (req.body.planId === "") {
          // Remove plan
          if (user.subscriptionId) {
             await Subscription.findByIdAndDelete(user.subscriptionId);
             user.subscriptionId = null;
          }
        } else {
          // Add or change plan
          const plan = await Plan.findById(req.body.planId);
          if (plan) {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + plan.durationDays);
            
            if (user.subscriptionId) {
               // Update existing subscription
               await Subscription.findByIdAndUpdate(user.subscriptionId, {
                 planId: plan._id,
                 endDate,
                 status: 'ACTIVE'
               });
            } else {
               // Create new subscription
               const sub = await Subscription.create({
                 userId: user._id,
                 planId: plan._id,
                 endDate
               });
               user.subscriptionId = sub._id;
            }
          }
        }
      }

      const updatedUser = await user.save();
      res.json(updatedUser);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/SuperAdmin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      if (req.user.role === 'ADMIN' && user.createdByAdminId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden: You do not manage this user' });
      }

      if (user.subscriptionId) {
        await Subscription.findByIdAndDelete(user.subscriptionId);
      }
      await user.deleteOne();
      res.json({ message: 'User removed' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Suspend user
// @route   PATCH /api/users/:id/suspend
// @access  Private/SuperAdmin
exports.suspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      if (req.user.role === 'ADMIN' && user.createdByAdminId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden: You do not manage this user' });
      }
      user.status = 'SUSPENDED';
      await user.save();
      res.json({ message: 'User suspended' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Activate user
// @route   PATCH /api/users/:id/activate
// @access  Private/SuperAdmin
exports.activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user) {
      if (req.user.role === 'ADMIN' && user.createdByAdminId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden: You do not manage this user' });
      }
      user.status = 'ACTIVE';
      await user.save();
      res.json({ message: 'User activated' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reset user password
// @route   PATCH /api/users/:id/reset-password
// @access  Private/SuperAdmin
exports.resetPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (user && req.body.password) {
      if (req.user.role === 'ADMIN' && user.createdByAdminId?.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Forbidden: You do not manage this user' });
      }
      user.password = req.body.password; // pre-save hook will hash it
      await user.save();
      res.json({ message: 'Password reset successful' });
    } else {
      res.status(404).json({ message: 'User not found or no password provided' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Manage user credits
// @route   POST /api/users/:id/credits
// @access  Private/SuperAdmin/Admin
exports.manageCredits = async (req, res) => {
  try {
    const { amount, action } = req.body;
    const parsedAmount = parseInt(amount);

    if (!parsedAmount || parsedAmount <= 0 || !['ADD', 'DEDUCT'].includes(action)) {
      return res.status(400).json({ message: 'Invalid amount or action' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    // Verify Admin owns this user
    if (req.user.role === 'ADMIN' && targetUser.assignedAdminId?.toString() !== req.user._id.toString() && targetUser.createdByAdminId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not manage this user' });
    }

    if (action === 'ADD') {
      if (req.user.role === 'ADMIN') {
        const admin = await User.findById(req.user._id);
        const availableCredits = (admin.allocatedCredits || 0) - (admin.distributedCredits || 0);
        if (parsedAmount > availableCredits) {
          return res.status(400).json({ message: `Insufficient AI credits. You have ${availableCredits} available.` });
        }
        admin.distributedCredits = (admin.distributedCredits || 0) + parsedAmount;
        await admin.save();
      }
      targetUser.allocatedCredits = (targetUser.allocatedCredits || 0) + parsedAmount;
    } else if (action === 'DEDUCT') {
      const remaining = (targetUser.allocatedCredits || 0) - (targetUser.usedCredits || 0);
      if (parsedAmount > remaining) {
        return res.status(400).json({ message: `Cannot deduct ${parsedAmount}. User only has ${remaining} remaining.` });
      }
      targetUser.allocatedCredits = (targetUser.allocatedCredits || 0) - parsedAmount;
      if (req.user.role === 'ADMIN') {
        const admin = await User.findById(req.user._id);
        admin.distributedCredits = Math.max(0, (admin.distributedCredits || 0) - parsedAmount);
        await admin.save();
      }
    }

    const updatedUser = await targetUser.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update current user profile
// @route   PATCH /api/users/me
// @access  Private (All authenticated)
exports.updateMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.body.name) user.name = req.body.name;
    if (req.body.username) user.username = req.body.username;
    if (req.body.phone) user.phone = req.body.phone;

    const updatedUser = await user.save();
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// @desc    Update current user avatar
// @route   PATCH /api/users/me/avatar
// @access  Private (All authenticated)
exports.updateMyAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const { deleteFile } = require('../services/cloudinary.service');
    
    // Delete old avatar if it exists and is a Cloudinary URL
    if (user.profilePicture && user.profilePicture.includes('cloudinary')) {
      await deleteFile(user.profilePicture);
    }

    user.profilePicture = req.file.path;
    const updatedUser = await user.save();
    
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

