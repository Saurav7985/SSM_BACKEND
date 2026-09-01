const mongoose = require('mongoose');

const activeSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  deviceName: {
    type: String,
    default: 'Unknown Device',
  },
  browser: {
    type: String,
    default: 'Unknown Browser',
  },
  os: {
    type: String,
    default: 'Unknown OS',
  },
  ipAddress: {
    type: String,
    default: '',
  },
  loginTime: {
    type: Date,
    default: Date.now,
  },
  lastActiveTime: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Add index for fast querying by userId
activeSessionSchema.index({ userId: 1 });

module.exports = mongoose.model('ActiveSession', activeSessionSchema);
