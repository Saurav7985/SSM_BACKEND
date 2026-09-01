const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
    default: 'ACTIVE'
  },
  usage: {
    postsPublished: { type: Number, default: 0 },
    postsScheduled: { type: Number, default: 0 },
    aiCreditsUsed: { type: Number, default: 0 },
    aiImageGenerationsUsed: { type: Number, default: 0 },
    aiVideoGenerationsUsed: { type: Number, default: 0 },
    videoUploadsUsed: { type: Number, default: 0 },
    storageUsedMB: { type: Number, default: 0 }
  }
}, { timestamps: true });

// Check expiration before saving
subscriptionSchema.pre('save', function(next) {
  if (this.endDate < new Date() && this.status === 'ACTIVE') {
    this.status = 'EXPIRED';
  }
  next();
});

subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ status: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
