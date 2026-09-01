const User = require('../models/user.model');
const crypto = require('crypto');

const generateLicenseKey = () => {
  return 'SMM-ADM-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
};

const getIp = (req) => req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
const getDevice = (req) => (req.headers['user-agent'] || '').substring(0, 120);

// @desc    Get all admins
// @route   GET /api/admins
// @access  Private/SuperAdmin
exports.getAdmins = async (req, res) => {
  try {
    const query = { role: 'ADMIN' };
    
    // Apply Filters
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { username: searchRegex },
        { email: searchRegex },
        { name: searchRegex }
      ];
    }
    
    if (req.query.status && req.query.status !== 'All') {
      query.status = req.query.status;
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
    const admins = await User.find(query).sort(sort).skip(skip).limit(limit);
    
    // Also get the number of users created by each admin
    const adminsWithStats = await Promise.all(admins.map(async (admin) => {
      const userCount = await User.countDocuments({ createdByAdminId: admin._id, role: 'USER' });
      return {
        ...admin.toObject(),
        usedUsers: userCount
      };
    }));

    res.json({
      data: adminsWithStats,
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

// @desc    Get single admin
// @route   GET /api/admins/:id
// @access  Private/SuperAdmin
exports.getAdminById = async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: 'ADMIN' });
    if (admin) {
      const userCount = await User.countDocuments({ createdByAdminId: admin._id, role: 'USER' });
      const adminObj = admin.toObject();
      adminObj.usedUsers = userCount;
      res.json(adminObj);
    } else {
      res.status(404).json({ message: 'Admin not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create admin
// @route   POST /api/admins
// @access  Private/SuperAdmin
exports.createAdmin = async (req, res) => {
  const { 
    username, email, password, status, profilePicture, 
    allocatedCredits, allocatedPosts, allocatedStorage, 
    allocatedUsers, allocatedSocialAccounts, allocatedPlatforms, notes, brandLogo 
  } = req.body;

  try {
    const GlobalSetting = require('../models/globalSetting.model');
    let settings = await GlobalSetting.findOne({ configId: 'global_config' });

    if (settings?.admin?.adminCreationPermission === false) {
      return res.status(403).json({ message: 'Admin creation is currently disabled.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const licenseKey = generateLicenseKey();
    const now = new Date();

    const admin = await User.create({
      username,
      email,
      password,
      role: 'ADMIN',
      status: status || 'ACTIVE',
      profilePicture,
      licenseKey,
      registrationMethod: 'CREATED_BY_ADMIN',
      registeredAt: now,
      createdByAdminId: req.user._id,
      ipAddress: getIp(req),
      deviceInfo: getDevice(req),
      allocatedCredits: parseInt(allocatedCredits) || 0,
      allocatedPosts: parseInt(allocatedPosts) || 0,
      allocatedStorage: parseInt(allocatedStorage) || 0,
      allocatedUsers: parseInt(allocatedUsers) || 0,
      allocatedSocialAccounts: parseInt(allocatedSocialAccounts) || 0,
      allocatedPlatforms: allocatedPlatforms || ['instagram', 'facebook', 'linkedin', 'youtube', 'twitter', 'threads', 'pinterest', 'whatsapp', 'tiktok', 'discord', 'slack', 'telegram', 'canva', 'reddit'],
      notes: notes || '',
      brandLogo: brandLogo || '',
    });

    res.status(201).json(admin);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update admin
// @route   PUT /api/admins/:id
// @access  Private/SuperAdmin
exports.updateAdmin = async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: 'ADMIN' });

    if (admin) {
      admin.username = req.body.username || admin.username;
      admin.email = req.body.email || admin.email;
      admin.profilePicture = req.body.profilePicture || admin.profilePicture;
      
      if (req.body.status) admin.status = req.body.status;
      if (req.body.allocatedCredits !== undefined) admin.allocatedCredits = req.body.allocatedCredits;
      if (req.body.allocatedPosts !== undefined) admin.allocatedPosts = req.body.allocatedPosts;
      if (req.body.allocatedStorage !== undefined) admin.allocatedStorage = req.body.allocatedStorage;
      if (req.body.allocatedUsers !== undefined) admin.allocatedUsers = req.body.allocatedUsers;
      if (req.body.allocatedSocialAccounts !== undefined) admin.allocatedSocialAccounts = req.body.allocatedSocialAccounts;
      if (req.body.allocatedPlatforms !== undefined) admin.allocatedPlatforms = req.body.allocatedPlatforms;
      if (req.body.notes !== undefined) admin.notes = req.body.notes;
      admin.assignedAdminId = req.body.assignedAdminId || admin.assignedAdminId;

      if (req.body.featurePermissions !== undefined) {
        admin.featurePermissions = {
          ...admin.featurePermissions,
          ...req.body.featurePermissions
        };
      }

      if (req.body.planOverrides !== undefined) {
        admin.planOverrides = {
          ...admin.planOverrides,
          ...req.body.planOverrides
        };
      }

      const updatedAdmin = await admin.save();
      res.json(updatedAdmin);
    } else {
      res.status(404).json({ message: 'Admin not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete admin
// @route   DELETE /api/admins/:id
// @access  Private/SuperAdmin
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: 'ADMIN' });

    if (admin) {
      await admin.deleteOne();
      res.json({ message: 'Admin removed' });
    } else {
      res.status(404).json({ message: 'Admin not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reset admin password
// @route   PATCH /api/admins/:id/reset-password
// @access  Private/SuperAdmin
exports.resetPassword = async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: 'ADMIN' });
    if (admin && req.body.password) {
      admin.password = req.body.password;
      await admin.save();
      res.json({ message: 'Password reset successful' });
    } else {
      res.status(404).json({ message: 'Admin not found or no password provided' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update admin logo
// @route   PATCH /api/admins/:id/logo
// @access  Private/SuperAdmin
exports.updateLogo = async (req, res) => {
  try {
    const admin = await User.findOne({ _id: req.params.id, role: 'ADMIN' });
    if (admin) {
      admin.brandLogo = req.body.brandLogo || '';
      await admin.save();
      res.json({ message: 'Logo updated successfully', brandLogo: admin.brandLogo });
    } else {
      res.status(404).json({ message: 'Admin not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
