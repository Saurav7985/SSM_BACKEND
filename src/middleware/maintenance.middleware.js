const GlobalSetting = require('../models/globalSetting.model');
const jwt = require('jsonwebtoken');

const maintenanceMiddleware = async (req, res, next) => {
  try {
    // Skip checking on the login route so Super Admins can always log in
    if (req.path === '/api/auth/login' || req.path === '/api/auth/register-super') {
      return next();
    }

    let settings = await GlobalSetting.findOne({ configId: 'global_config' });
    if (!settings || !settings.maintenance || !settings.maintenance.maintenanceMode) {
      return next();
    }

    // Maintenance mode is ON.
    // Allow SUPER_ADMIN to pass through.
    let isSuperAdmin = false;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role === 'SUPER_ADMIN') {
          isSuperAdmin = true;
        }
      } catch (err) {
        // Token invalid, ignore and continue to block
      }
    }

    if (isSuperAdmin) {
      return next();
    }

    // Block the request
    return res.status(503).json({
      error: 'MAINTENANCE_MODE',
      message: settings.maintenance.maintenanceMessage || 'We are currently undergoing maintenance. Please check back later.'
    });
  } catch (error) {
    console.error('Maintenance middleware error:', error);
    next();
  }
};

module.exports = maintenanceMiddleware;
