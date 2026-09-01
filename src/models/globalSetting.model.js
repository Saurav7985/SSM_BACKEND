const mongoose = require('mongoose');

const globalSettingSchema = new mongoose.Schema({
  configId: { type: String, default: 'global_config', unique: true },
  
  general: {
    platformName: { type: String, default: 'Binj SMM' },
    companyName: { type: String, default: 'Binj Ai' },
    supportEmail: { type: String, default: 'support@binjai.com' },
    contactEmail: { type: String, default: 'contact@binjai.com' },
    defaultTimezone: { type: String, default: 'UTC' },
    dateFormat: { type: String, default: 'MM/DD/YYYY' },
    timeFormat: { type: String, default: '12h' },
    defaultLanguage: { type: String, default: 'en' },
    maintenanceMode: { type: Boolean, default: false }
  },

  branding: {
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    loginPageLogo: { type: String, default: '' },
    dashboardBranding: { type: Boolean, default: true },
    emailBranding: { type: Boolean, default: true },
    allowLogoReplacement: { type: Boolean, default: true }
  },

  userAndAccount: {
    userSignupEnabled: { type: Boolean, default: true },
    adminCreatedUserEnabled: { type: Boolean, default: true },
    emailVerificationRequired: { type: Boolean, default: true },
    accountApprovalRequired: { type: Boolean, default: false },
    passwordMinLength: { type: Number, default: 8 },
    passwordComplexity: { type: Boolean, default: true },
    sessionTimeout: { type: Number, default: 120 }, // minutes
    maxActiveSessions: { type: Number, default: 3 },
    autoLogout: { type: Boolean, default: false },
    accountSuspensionBehavior: { type: String, default: 'soft' } // soft, hard
  },

  admin: {
    adminCreationPermission: { type: Boolean, default: true },
    adminUserCreationPermission: { type: Boolean, default: true },
    adminCreditAllocation: { type: Number, default: 1000 },
    adminPlatformAllocation: { type: Number, default: 5 },
    adminAnalyticsAccess: { type: Boolean, default: true },
    adminSupportTicketAccess: { type: Boolean, default: true },
    adminUserManagementPermissions: { type: Boolean, default: true }
  },

  subscription: {
    // Default fallback features
    trialPeriodDays: { type: Number, default: 14 },
    autoExpiration: { type: Boolean, default: true },
    upgradeDowngradeOptions: { type: Boolean, default: true },
    gracePeriodDays: { type: Number, default: 3 }
  },

  credit: {
    adminCreditAllocation: { type: Number, default: 10000 },
    userCreditAllocation: { type: Number, default: 100 },
    creditExpiryDays: { type: Number, default: 30 },
    creditTransfer: { type: Boolean, default: false },
    creditRefund: { type: Boolean, default: false },
    creditUsageTracking: { type: Boolean, default: true }
  },

  social: {
    platforms: {
      type: Map,
      of: new mongoose.Schema({
        enabled: { type: Boolean, default: true },
        connectionAvailability: { type: Boolean, default: true },
        publishingAvailability: { type: Boolean, default: true },
        analyticsAvailability: { type: Boolean, default: true }
      }, { _id: false }),
      default: {
        Instagram: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true },
        Facebook: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true },
        LinkedIn: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true },
        YouTube: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true },
        X: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true },
        Threads: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true },
        Pinterest: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true },
        WhatsApp: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true },
        Bluesky: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true },
        TikTok: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true },
        Discord: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true },
        Slack: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true },
        Telegram: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true },
        Canva: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true },
        Reddit: { enabled: true, connectionAvailability: true, publishingAvailability: true, analyticsAvailability: true }
      }
    }
  },

  moderation: {
    spamDetection: { type: Boolean, default: true },
    keywordDetection: { type: Boolean, default: true },
    aiModeration: { type: Boolean, default: true },
    adminApprovalRequired: { type: Boolean, default: false },
    autoApproveSafeContent: { type: Boolean, default: true },
    autoRejectHighRiskContent: { type: Boolean, default: true },
    moderationThreshold: { type: Number, default: 75 },
    spamKeywords: [{ type: String }]
  },

  notification: {
    newAdmin: { type: Boolean, default: true },
    newUser: { type: Boolean, default: true },
    subscriptionExpiry: { type: Boolean, default: true },
    subscriptionExpired: { type: Boolean, default: true },
    lowCredits: { type: Boolean, default: true },
    newSupportTicket: { type: Boolean, default: true },
    postPublished: { type: Boolean, default: true },
    postFailed: { type: Boolean, default: true },
    socialMediaConnection: { type: Boolean, default: true },
    loginActivity: { type: Boolean, default: true },
    securityAlert: { type: Boolean, default: true },
    paymentNotification: { type: Boolean, default: true }
  },

  security: {
    passwordPolicy: { type: String, default: 'strong' },
    maxLoginAttempts: { type: Number, default: 5 },
    accountLockoutDuration: { type: Number, default: 15 }, // minutes
    sessionTimeout: { type: Number, default: 120 },
    multiDeviceSessionLimit: { type: Number, default: 3 },
    forceLogout: { type: Boolean, default: false },
    suspiciousLoginDetection: { type: Boolean, default: true },
    ipTracking: { type: Boolean, default: true },
    deviceTracking: { type: Boolean, default: true },
    mfaOption: { type: Boolean, default: false },
    securityAlerts: { type: Boolean, default: true }
  },

  loginTracking: {
    loginTracking: { type: Boolean, default: true },
    logoutTracking: { type: Boolean, default: true },
    ipTracking: { type: Boolean, default: true },
    deviceTracking: { type: Boolean, default: true },
    browserTracking: { type: Boolean, default: true },
    locationTracking: { type: Boolean, default: true },
    loginHistoryRetentionDays: { type: Number, default: 90 },
    activityLogRetentionDays: { type: Number, default: 90 }
  },

  support: {
    supportTicketEnabled: { type: Boolean, default: true },
    ticketCategories: [{ type: String, default: ['General', 'Billing', 'Technical', 'Bug'] }],
    ticketPriorities: [{ type: String, default: ['Low', 'Medium', 'High', 'Urgent'] }],
    defaultPriority: { type: String, default: 'Medium' },
    platformSelection: { type: Boolean, default: true },
    autoCloseInactiveTicketsDays: { type: Number, default: 7 },
    adminAssignment: { type: Boolean, default: true },
    ticketNotifications: { type: Boolean, default: true }
  },

  storage: {
    maxImageSizeMB: { type: Number, default: 10 },
    maxVideoSizeMB: { type: Number, default: 100 },
    maxFileSizeMB: { type: Number, default: 50 },
    allowedFileTypes: [{ type: String, default: ['image/jpeg', 'image/png', 'video/mp4'] }],
    userStorageLimitMB: { type: Number, default: 1000 },
    libraryStorageLimitMB: { type: Number, default: 5000 },
    tempFileRetentionDays: { type: Number, default: 7 }
  },

  ai: {
    aiStudioEnabled: { type: Boolean, default: true },
    aiCaptionGeneration: { type: Boolean, default: true },
    aiImageGeneration: { type: Boolean, default: true },
    aiVideoGeneration: { type: Boolean, default: false },
    aiUsageLimits: { type: Boolean, default: true },
    dailyAiLimits: { type: Number, default: 50 },
    monthlyAiLimits: { type: Number, default: 1000 },
    aiProviderConfiguration: { type: String, default: 'openai' }
  },

  email: {
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 587 },
    smtpUser: { type: String, default: '' },
    smtpPassword: { type: String, default: '' },
    senderName: { type: String, default: 'Binj SMM' },
    senderEmail: { type: String, default: 'noreply@binjai.com' },
    welcomeEmail: { type: Boolean, default: true },
    passwordResetEmail: { type: Boolean, default: true },
    subscriptionExpiryEmail: { type: Boolean, default: true },
    supportTicketEmail: { type: Boolean, default: true },
    notificationEmail: { type: Boolean, default: true }
  },

  maintenance: {
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'We are currently undergoing maintenance. Please check back later.' },
    maintenanceStartTime: { type: Date, default: null },
    maintenanceEndTime: { type: Date, default: null }
  }
}, { timestamps: true });

module.exports = mongoose.model('GlobalSetting', globalSettingSchema);
