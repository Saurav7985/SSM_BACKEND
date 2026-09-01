const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  plan: {
    type: String,
    default: 'free'
  },
  allocatedCredits: {
    type: Number,
    default: 0
  },
  usedCredits: {
    type: Number,
    default: 0
  },
  allocatedStorage: {
    type: Number,
    default: 0 // in GB
  },
  usedStorage: {
    type: Number,
    default: 0 // in GB
  }
}, { timestamps: true });

workspaceSchema.index({ ownerId: 1 });
workspaceSchema.index({ status: 1 });

module.exports = mongoose.model('Workspace', workspaceSchema);
