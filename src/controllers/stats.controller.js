const User = require('../models/user.model');
const Subscription = require('../models/subscription.model');
const Plan = require('../models/plan.model');

// @desc    Get platform stats + recent registrations
// @route   GET /api/stats
// @access  Private/SuperAdmin
exports.getStats = async (req, res) => {
  try {
    const userQuery = { role: 'USER' };
    const adminQuery = { role: 'ADMIN' };
    
    // RBAC: If requester is ADMIN, restrict to their users
    if (req.user.role === 'ADMIN') {
      userQuery.createdByAdminId = req.user._id;
    }
    // Filter by admin if SUPER_ADMIN
    if (req.user.role === 'SUPER_ADMIN' && req.query.adminId && req.query.adminId !== 'All') {
      userQuery.createdByAdminId = req.query.adminId;
    }

    if (req.query.status && req.query.status !== 'All') {
      userQuery.status = req.query.status;
      adminQuery.status = req.query.status;
    }

    const [totalUsers, totalAdmins, activeSubs, expiredSubs, activePlans] = await Promise.all([
      User.countDocuments(userQuery),
      User.countDocuments(adminQuery),
      Subscription.countDocuments({ status: 'ACTIVE' }),
      Subscription.countDocuments({ status: 'EXPIRED' }),
      Plan.countDocuments({ status: 'ACTIVE' }),
    ]);

    // Recent registrations — newest 10, with full tracking info
    // (Apply same filters)
    const recentQuery = { ...userQuery }; // recent regs usually means Users
    const recentRegistrations = await User.find(recentQuery)
      .sort({ registeredAt: -1 })
      .limit(10)
      .populate({ path: 'subscriptionId', populate: { path: 'planId' } })
      .select('username email role status registeredAt registrationMethod lastLogin ipAddress deviceInfo profilePicture licenseKey createdAt subscriptionId');

    res.json({
      totalUsers,
      totalAdmins,
      activeSubs,
      expiredSubs,
      activePlans,
      recentRegistrations,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
