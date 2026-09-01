const GlobalSetting = require('../models/globalSetting.model');
const AuditLog = require('../models/auditLog.model');

// Get Global Settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await GlobalSetting.findOne({ configId: 'global_config' });
    if (!settings) {
      settings = await GlobalSetting.create({ configId: 'global_config' });
    }
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Server error fetching settings' });
  }
};

// Get Public Enabled Platforms List (No auth required, or basic auth)
exports.getPublicPlatforms = async (req, res) => {
  try {
    const settings = await GlobalSetting.findOne({ configId: 'global_config' });
    const platformsConfig = settings?.social?.platforms || {};
    
    // Return a clean map of { "Instagram": true, "Facebook": false, ... }
    const platformStatus = {};
    const SUPPORTED_PLATFORMS = [
      "Instagram", "Facebook", "LinkedIn", "YouTube", "X/Twitter", 
      "Threads", "Pinterest", "WhatsApp", "TikTok", "Discord", 
      "Slack", "Telegram", "Canva", "Reddit", "Bluesky"
    ];

    SUPPORTED_PLATFORMS.forEach(name => {
      // Default to true if not explicitly disabled
      platformStatus[name.toLowerCase()] = platformsConfig[name]?.enabled ?? true;
      platformStatus[name] = platformsConfig[name]?.enabled ?? true; // Support both cases
    });

    res.json(platformStatus);
  } catch (error) {
    console.error('Error fetching public platforms:', error);
    res.status(500).json({ error: 'Server error fetching public platforms' });
  }
};

// Update Global Settings
exports.updateSettings = async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied. Super Admin only.' });
    }

    let settings = await GlobalSetting.findOne({ configId: 'global_config' });
    if (!settings) {
      settings = new GlobalSetting({ configId: 'global_config' });
    }

    // Keep a copy of previous settings for audit log
    const previousValue = settings.toObject();
    const newValue = req.body;

    // Deep merge function
    const isObject = (item) => (item && typeof item === 'object' && !Array.isArray(item));
    const deepMerge = (target, source) => {
      if (isObject(target) && isObject(source)) {
        for (const key in source) {
          if (isObject(source[key])) {
            if (!target[key]) Object.assign(target, { [key]: {} });
            deepMerge(target[key], source[key]);
          } else {
            Object.assign(target, { [key]: source[key] });
          }
        }
      }
      return target;
    };

    const currentObj = settings.toObject();
    deepMerge(currentObj, newValue);
    
    // Explicitly set the merged object back to trigger Mongoose change tracking
    settings.set(currentObj);
    
    // Mongoose Maps require explicit .set() to register changes
    if (newValue.social && newValue.social.platforms) {
      if (!settings.social) settings.social = {};
      if (!settings.social.platforms) settings.social.platforms = new Map();
      
      for (const [key, val] of Object.entries(newValue.social.platforms)) {
        settings.social.platforms.set(key, val);
      }
    }
    
    settings.markModified('social.platforms');
    settings.markModified('social');

    await settings.save();

    // Create Audit Log
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const device = req.headers['user-agent'] || 'Unknown';

    await AuditLog.create({
      user: req.user._id,
      role: req.user.role,
      action: 'Updated Global Settings',
      previousValue,
      newValue,
      ipAddress,
      device
    });

    res.json({ message: 'Settings updated successfully', settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Server error updating settings' });
  }
};
