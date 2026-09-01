const mongoose = require('mongoose');

const socialAccountSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  platform: {
    type: String,
    enum: [
      'Instagram', 'Facebook', 'LinkedIn', 'YouTube', 'X/Twitter', 
      'Threads', 'Pinterest', 'WhatsApp', 'TikTok', 'Discord', 
      'Slack', 'Telegram', 'Canva', 'Reddit', 'Bluesky'
    ],
    required: true
  },
  accountId: {
    type: String,
    required: true
  },
  accountName: {
    type: String,
    required: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    default: ''
  },
  tokenExpiry: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['CONNECTED', 'DISCONNECTED', 'ERROR'],
    default: 'CONNECTED'
  }
}, { timestamps: true });

// Prevent a user from connecting the exact same account multiple times in the same workspace
socialAccountSchema.index({ workspaceId: 1, userId: 1, platform: 1, accountId: 1 }, { unique: true });

module.exports = mongoose.model('SocialAccount', socialAccountSchema);
