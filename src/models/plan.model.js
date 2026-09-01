const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  price: {
    type: Number,
    required: true
  },
  durationDays: {
    type: Number,
    required: true,
    default: 30
  },
  limits: {
    maxAccounts: { type: Number, default: 0 },
    maxPostsPerMonth: { type: Number, default: 0 },
    maxScheduledPosts: { type: Number, default: 0 },
    aiCredits: { type: Number, default: 0 },
    aiContentGenerations: { type: Number, default: 0 },
    aiImageGenerations: { type: Number, default: 0 },
    aiVideoGenerations: { type: Number, default: 0 },
    videoUploadLimit: { type: Number, default: 0 },
    maxVideoSizeMB: { type: Number, default: 0 },
    storageLimitMB: { type: Number, default: 0 }
  },
  enabledPlatforms: [{
    type: String,
    enum: ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'X', 'YOUTUBE', 'TIKTOK', 'THREADS', 'PINTEREST', 'WHATSAPP', ]
  }],
  enabledFeatures: [{
    type: String,
    enum: [
      'AI_CAPTION', 'AI_CONTENT', 'AI_HASHTAG', 'AI_IMAGE', 'AI_VIDEO',
      'IMAGE_UPLOAD', 'VIDEO_UPLOAD', 'REEL_UPLOAD', 'STORY_UPLOAD', 'BULK_UPLOAD',
      'DIRECT_PUBLISH', 'SCHEDULE_POSTS', 'DRAFTS', 'RECURRING_POSTS',
      'REPORTS', 'DASHBOARD', 'EXPORT_REPORTS'
    ]
  }],
  status: {
    type: String,
    enum: ['ACTIVE', 'ARCHIVED'],
    default: 'ACTIVE'
  },
  badge: {
    type: String,
    default: ''
  },
  highlighted: {
    type: Boolean,
    default: false
  },
  bestValue: {
    type: Boolean,
    default: false
  },
  subtext: {
    type: String,
    default: ''
  },
  cta: {
    type: String,
    default: 'Get Started'
  }
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
