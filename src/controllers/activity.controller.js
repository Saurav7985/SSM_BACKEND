const LoginActivity = require('../models/loginActivity.model');
const User = require('../models/user.model');

// Helper to build search queries
const buildQuery = (req, baseQuery = {}) => {
  const query = { ...baseQuery };
  
  if (req.query.role) query.role = req.query.role;
  if (req.query.status) query.status = req.query.status;
  
  if (req.query.startDate || req.query.endDate) {
    query.loginAt = {};
    if (req.query.startDate) query.loginAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) query.loginAt.$lte = new Date(req.query.endDate);
  }

  // We could implement search by name/email/username here, but it requires joining User.
  // We'll handle it via populate if needed.

  return query;
};

// @desc    Get all activity (Super Admin)
// @route   GET /api/activity/super
// @access  Private (SUPER_ADMIN)
exports.getSuperAdminActivity = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const baseQuery = {};
    if (req.query.userId) baseQuery.userId = req.query.userId;
    if (req.query.adminId) baseQuery.adminId = req.query.adminId;

    const query = buildQuery(req, baseQuery);

    const activities = await LoginActivity.find(query)
      .populate('userId', 'username email role name')
      .populate('adminId', 'username email')
      .sort('-loginAt')
      .skip(skip)
      .limit(limit);

    const total = await LoginActivity.countDocuments(query);

    res.json({
      data: activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get activity for assigned users (Admin)
// @route   GET /api/activity/admin
// @access  Private (ADMIN)
exports.getAdminActivity = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Must only see users assigned to this admin, or their own activity if we allow that. 
    // We will lock it to assigned users or themself.
    const query = buildQuery(req, { $or: [{ adminId: req.user.id }, { userId: req.user.id }] });

    if (req.query.userId) {
       // ensure the requested user actually belongs to this admin
       const targetUser = await User.findById(req.query.userId);
       if (targetUser && targetUser.assignedAdminId && targetUser.assignedAdminId.toString() === req.user.id.toString()) {
           query.userId = req.query.userId;
       } else {
           return res.status(403).json({ message: 'Not authorized to view this user' });
       }
    }

    const activities = await LoginActivity.find(query)
      .populate('userId', 'username email role name')
      .sort('-loginAt')
      .skip(skip)
      .limit(limit);

    const total = await LoginActivity.countDocuments(query);

    res.json({
      data: activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get my own activity (User)
// @route   GET /api/activity/me
// @access  Private
exports.getUserActivity = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = buildQuery(req, { userId: req.user.id });

    const activities = await LoginActivity.find(query)
      .populate('userId', 'username email role name')
      .sort('-loginAt')
      .skip(skip)
      .limit(limit);

    const total = await LoginActivity.countDocuments(query);

    res.json({
      data: activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
