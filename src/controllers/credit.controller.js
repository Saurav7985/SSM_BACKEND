const User = require('../models/user.model');
const CreditTransaction = require('../models/creditTransaction.model');
const crypto = require('crypto');

// @desc    Allocate or Deduct credits
// @route   POST /api/credits/allocate
// @access  Private (Admin only)
exports.allocateCredits = async (req, res) => {
  try {
    // In a real app, adminId comes from JWT via middleware (req.user._id)
    // For this demonstration, we'll accept it in the body if not set
    const adminId = req.user ? req.user._id : req.body.adminId;
    const { userId, amount, action, notes } = req.body;

    if (!adminId || !userId || !amount || !action) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const admin = await User.findById(adminId);
    const user = await User.findById(userId);

    if (!admin || !user) {
      return res.status(404).json({ message: 'Admin or User not found' });
    }

    const parsedAmount = parseInt(amount);
    
    // Simulate Admin's starting balance (e.g. 1000 fixed for this demo, minus allocated)
    // Normally, this comes from a Tenant or Subscription model.
    const adminTotalCredits = 1000;
    const adminAvailable = adminTotalCredits - (admin.allocatedCredits || 0);

    let newAdminAllocated = admin.allocatedCredits || 0;
    let newUserAllocated = user.allocatedCredits || 0;

    if (action === 'ADD') {
      if (parsedAmount > adminAvailable) {
        return res.status(400).json({ message: 'Insufficient admin balance' });
      }
      newAdminAllocated += parsedAmount;
      newUserAllocated += parsedAmount;
    } else if (action === 'DEDUCT') {
      const userRemaining = (user.allocatedCredits || 0) - (user.usedCredits || 0);
      if (parsedAmount > userRemaining) {
        return res.status(400).json({ message: 'Cannot deduct more than user has remaining' });
      }
      newAdminAllocated -= parsedAmount;
      newUserAllocated -= parsedAmount;
    } else {
      return res.status(400).json({ message: 'Invalid action' });
    }

    admin.allocatedCredits = newAdminAllocated;
    user.allocatedCredits = newUserAllocated;

    await admin.save();
    await user.save();

    const transaction = await CreditTransaction.create({
      transactionId: `TXN-${crypto.randomUUID().substring(0,8).toUpperCase()}`,
      adminId: admin._id,
      userId: user._id,
      action,
      amount: parsedAmount,
      adminPostBalance: adminTotalCredits - newAdminAllocated,
      userPostBalance: newUserAllocated,
      notes
    });

    res.status(200).json({ message: 'Credits updated successfully', transaction, user });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get Audit Logs
// @route   GET /api/credits/logs
// @access  Private (Admin only)
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await CreditTransaction.find().populate('adminId', 'username').populate('userId', 'username').sort({ createdAt: -1 });
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get Users with Credit Balances
// @route   GET /api/credits/users
// @access  Private (Admin only)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'SUPER_ADMIN' } }).select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
