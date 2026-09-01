const ActiveSession = require('../models/activeSession.model');
const User = require('../models/user.model');
const LoginActivity = require('../models/loginActivity.model');

// @desc    Get all active sessions for the current user
// @route   GET /api/sessions/my-sessions
// @access  Private
exports.getMySessions = async (req, res) => {
  try {
    const sessions = await ActiveSession.find({ userId: req.user.id }).sort('-loginTime');
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Logout (Revoke) a specific session
// @route   DELETE /api/sessions/:sessionId
// @access  Private (or Revoke token)
exports.logoutSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ActiveSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Ensure the user owns the session or is a super admin, or the admin owns this user
    if (session.userId.toString() !== req.user.id.toString()) {
       // Check if super admin
       if (req.user.role === 'SUPER_ADMIN') {
         // allowed
       } else if (req.user.role === 'ADMIN') {
         // Check if the user belongs to this admin
         const targetUser = await User.findById(session.userId);
         if (!targetUser || targetUser.assignedAdminId?.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Not authorized to revoke this session' });
         }
       } else {
         return res.status(403).json({ message: 'Not authorized to revoke this session' });
       }
    }

    await ActiveSession.deleteOne({ sessionId });
    await LoginActivity.updateOne({ sessionId }, { status: 'Logged Out', logoutAt: new Date() });
    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Logout from all other devices
// @route   DELETE /api/sessions/others
// @access  Private
exports.logoutOtherSessions = async (req, res) => {
  try {
    // req.sessionId is injected by auth middleware
    if (!req.sessionId) {
       return res.status(400).json({ message: 'Current session ID not found' });
    }
    const sessionsToRevoke = await ActiveSession.find({
      userId: req.user.id,
      sessionId: { $ne: req.sessionId }
    });
    const sessionIdsToRevoke = sessionsToRevoke.map(s => s.sessionId);

    await ActiveSession.deleteMany({
      userId: req.user.id,
      sessionId: { $ne: req.sessionId }
    });

    await LoginActivity.updateMany(
      { sessionId: { $in: sessionIdsToRevoke } },
      { status: 'Logged Out', logoutAt: new Date() }
    );

    res.json({ message: 'Logged out of all other devices' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get active sessions of assigned users (for Admins)
// @route   GET /api/sessions/admin/users
// @access  Private (ADMIN)
exports.getAdminUsersSessions = async (req, res) => {
  try {
    const users = await User.find({ assignedAdminId: req.user.id }).select('_id username email status');
    const userIds = users.map(u => u._id);
    
    const sessions = await ActiveSession.find({ userId: { $in: userIds } }).sort('-loginTime').populate('userId', 'username email status');
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all active sessions across the platform
// @route   GET /api/sessions/super/all
// @access  Private (SUPER_ADMIN)
exports.getAllSessions = async (req, res) => {
  try {
    const sessions = await ActiveSession.find().sort('-loginTime').populate('userId', 'username email role status');
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
