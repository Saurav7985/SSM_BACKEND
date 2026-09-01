const mongoose = require('mongoose');

const loginActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // Populated for fast admin-specific lookups if the user has an assignedAdminId
  },
  role: {
    type: String,
    required: true,
  },
  sessionId: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    default: '',
  },
  device: {
    type: String,
    default: 'Unknown Device',
  },
  browser: {
    type: String,
    default: 'Unknown Browser',
  },
  operatingSystem: {
    type: String,
    default: 'Unknown OS',
  },
  location: {
    type: String,
    default: 'Unknown Location',
  },
  loginAt: {
    type: Date,
    default: Date.now,
  },
  logoutAt: {
    type: Date,
    default: null,
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['Active', 'Logged Out', 'Expired'],
    default: 'Active',
  },
}, { timestamps: true });

// Add indexes for fast querying by userId, adminId, and sessionId
loginActivitySchema.index({ userId: 1 });
loginActivitySchema.index({ adminId: 1 });
loginActivitySchema.index({ sessionId: 1 });

module.exports = mongoose.model('LoginActivity', loginActivitySchema);
