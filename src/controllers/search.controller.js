const User = require('../models/user.model');
const Subscription = require('../models/subscription.model');
const Plan = require('../models/plan.model');

// @desc    Global Search across Users, Admins, and Plans
// @route   GET /api/search
// @access  Private
exports.globalSearch = async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json({ users: [], admins: [], plans: [], tickets: [] }); // Supabase tickets are handled on frontend or in another way, but we return empty here just in case

    const searchRegex = new RegExp(q, 'i');
    
    // RBAC
    const role = req.user.role;
    const userId = req.user._id;

    // Search Users
    let userQuery = { role: 'USER', $or: [{ username: searchRegex }, { email: searchRegex }, { name: searchRegex }] };
    if (role === 'ADMIN') userQuery.createdByAdminId = userId;
    else if (role === 'USER') userQuery._id = userId; // Users only find themselves
    const users = await User.find(userQuery).select('_id username email profilePicture role').limit(5);

    // Search Admins
    let adminQuery = { role: 'ADMIN', $or: [{ username: searchRegex }, { email: searchRegex }, { name: searchRegex }] };
    if (role === 'ADMIN') adminQuery._id = userId;
    else if (role === 'USER') adminQuery._id = null; // Users cannot search admins
    const admins = await User.find(adminQuery).select('_id username email profilePicture role').limit(5);

    // Search Plans
    const plans = await Plan.find({ name: searchRegex }).select('_id name price features').limit(5);

    res.json({
      users,
      admins,
      plans
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
