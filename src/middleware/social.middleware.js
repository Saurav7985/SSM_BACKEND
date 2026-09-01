const GlobalSetting = require('../models/globalSetting.model');
const User = require('../models/user.model');

/**
 * Middleware to enforce Social Platform constraints.
 * Ensures the platform is enabled globally, by the Admin, and allocated to the User.
 */
const requirePlatformAccess = async (req, res, next) => {
  try {
    const platform = req.body.platform || req.params.platform;

    if (!platform) {
      return res.status(400).json({ message: 'Platform name is required.' });
    }

    // Super Admin bypasses all checks
    if (req.user && req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // 1. Check Global Settings
    const settings = await GlobalSetting.findOne({ configId: 'global_config' });
    if (settings && settings.social && settings.social.platforms) {
      const platformConfig = settings.social.platforms[platform];
      if (platformConfig && platformConfig.enabled === false) {
        return res.status(403).json({ 
          message: `Connection Blocked: The ${platform} platform is currently disabled globally by the Super Admin.` 
        });
      }
    }

    // 2. Check User's Allocated Platforms
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If allocatedPlatforms is not populated or doesn't include it, block it
    if (!user.allocatedPlatforms || !user.allocatedPlatforms.includes(platform)) {
      return res.status(403).json({ 
        message: `Connection Blocked: You do not have permission to connect to ${platform}. Please contact your Admin.` 
      });
    }

    // If we passed all checks, proceed
    next();
  } catch (err) {
    console.error('Error in socialMiddleware:', err);
    res.status(500).json({ message: 'Server error while verifying platform access.' });
  }
};

module.exports = {
  requirePlatformAccess
};
