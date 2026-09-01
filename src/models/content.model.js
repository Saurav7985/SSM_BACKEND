const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'pending_approval', 'approved', 'rejected', 'scheduled', 'published', 'failed'],
    default: 'draft'
  },
  text: {
    type: String,
    default: ''
  },
  mediaUrls: [{
    type: String
  }],
  rejectionReason: {
    type: String,
    default: ''
  },
  platforms: [{
    type: String
  }],
  scheduledFor: {
    type: Date
  },
  publishedAt: {
    type: Date
  }
}, { timestamps: true });

contentSchema.index({ workspaceId: 1, status: 1 });
contentSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Content', contentSchema);
