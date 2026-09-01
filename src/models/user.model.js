const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  companyName: {
    type: String,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  country: {
    type: String,
    required: true
  },
  timezone: {
    type: String,
    required: true
  },
  plan: {
    type: String,
    enum: ['free', 'basic', 'silver', 'gold', 'enterprise', 'GOLD'],
    default: 'free'
  },
  role: {
    type: String,
    enum: ["user", "admin", "SUPER_ADMIN", "ADMIN", "USER"],
    default: "user"
  },
  assignedAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED'],
    default: 'ACTIVE'
  },
  profilePicture: {
    type: String,
    default: ''
  },
  brandLogo: {
    type: String,
    default: ''
  },
  licenseKey: {
    type: String,
    unique: true,
    sparse: true
  },

  // === Registration Activity Tracking ===
  registrationMethod: {
    type: String,
    enum: ['SELF_SIGNUP', 'CREATED_BY_ADMIN'],
    default: 'CREATED_BY_ADMIN'
  },
  createdByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    default: ''
  },
  deviceInfo: {
    type: String,
    default: ''
  },
  lastLogin: {
    type: Date,
    default: null
  },
  lastLoginIp: {
    type: String,
    default: ''
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
  },
  allocatedPosts: {
    type: Number,
    default: 0
  },
  usedPosts: {
    type: Number,
    default: 0
  },
  distributedCredits: {
    type: Number,
    default: 0
  },
  distributedStorage: {
    type: Number,
    default: 0
  },
  distributedPosts: {
    type: Number,
    default: 0
  },
  allocatedUsers: {
    type: Number,
    default: 0
  },
  usedUsers: {
    type: Number,
    default: 0
  },
  allocatedSocialAccounts: {
    type: Number,
    default: 0
  },
  usedSocialAccounts: {
    type: Number,
    default: 0
  },
  allocatedPlatforms: {
    type: [String],
    default: ['instagram', 'facebook', 'linkedin', 'youtube', 'twitter', 'threads', 'pinterest', 'whatsapp', 'tiktok', 'discord', 'slack', 'telegram', 'canva', 'reddit'] // Default to all initially for backward compatibility
  },
  notes: {
    type: String,
    default: ''
  },
  recycleBinCleanupDays: {
    type: Number,
    default: 0 // 0 means disabled
  },
  
  // === Feature Permissions & Overrides ===
  featurePermissions: {
    aiAccess: { type: Boolean, default: null }, // null means inherit from higher level
    messengerAccess: { type: Boolean, default: null },
    analyticsAccess: { type: Boolean, default: null },
    schedulingAccess: { type: Boolean, default: null },
    libraryAccess: { type: Boolean, default: null },
    brandKitAccess: { type: Boolean, default: null },
    createContentAccess: { type: Boolean, default: null },
    supportTicketAccess: { type: Boolean, default: null },
    notificationAccess: { type: Boolean, default: null }
  },
  planOverrides: {
    maxPosts: { type: Number, default: null }, // null means use Plan limit
    storageLimit: { type: Number, default: null },
    aiGenerationLimit: { type: Number, default: null },
    socialPlatformLimit: { type: Number, default: null }
  }

}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return; // ← CRITICAL: must return to stop execution
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
  


// Method to compare passwords
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Add indexes for optimization
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

module.exports = mongoose.model('User', userSchema);
