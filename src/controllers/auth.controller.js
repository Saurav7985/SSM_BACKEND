const User = require('../models/user.model');
const GlobalSetting = require('../models/globalSetting.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const LoginActivity = require('../models/loginActivity.model');

const generateToken = (id, role, sessionId = null) => {
  const payload = { id, role };
  if (sessionId) payload.sessionId = sessionId;
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const getIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    ''
  );
};

const getDeviceInfo = (req) => {
  const ua = req.headers['user-agent'] || '';
  if (ua.includes('Mobile')) return ua.substring(0, 120);
  return ua.substring(0, 120);
};

const getParsedUA = (req) => {
  const parser = new UAParser(req.headers['user-agent'] || '');
  const result = parser.getResult();
  
  let deviceType = 'PC';
  if (result.device.type === 'mobile') deviceType = 'Mobile';
  else if (result.device.type === 'tablet') deviceType = 'Tablet';
  else if (result.os.name === 'Mac OS') deviceType = 'Mac';
  
  return {
    device: result.device.vendor || result.device.model ? `${result.device.vendor || ''} ${result.device.model || ''}`.trim() : deviceType,
    browser: result.browser.name ? `${result.browser.name} ${result.browser.version || ''}`.trim() : 'Unknown Browser',
    os: result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : 'Unknown OS'
  };
};

// @desc    Register super admin (Initial setup only)
// @route   POST /api/auth/register-super
// @access  Public
exports.registerSuperAdmin = async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const user = await User.create({
      username,
      email,
      password,
      role: 'SUPER_ADMIN',
      registrationMethod: 'SELF_SIGNUP',
      registeredAt: new Date(),
      ipAddress: getIp(req),
      deviceInfo: getDeviceInfo(req),
    });
    // For super admin registration, we don't strictly enforce limit right here as it's the first time
    const crypto = require('crypto');
    const ActiveSession = require('../models/activeSession.model');
    
    const sessionId = crypto.randomUUID();
    const ip = getIp(req);
    const geo = geoip.lookup(ip);
    const location = geo ? `${geo.city}, ${geo.country}` : 'Unknown Location';
    const deviceInfo = getDeviceInfo(req);
    const parsedUA = getParsedUA(req);

    await ActiveSession.create({
      userId: user._id,
      sessionId,
      deviceName: parsedUA.device,
      browser: parsedUA.browser,
      os: parsedUA.os,
      ipAddress: ip
    });

    await LoginActivity.create({
      userId: user._id,
      role: user.role,
      sessionId,
      ipAddress: ip,
      device: parsedUA.device,
      browser: parsedUA.browser,
      operatingSystem: parsedUA.os,
      location,
      loginAt: new Date(),
      lastActiveAt: new Date()
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role, sessionId)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Register normal user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  const { fullName, companyName, email, phoneNumber, username, password, confirmPassword, country, timezone, plan } = req.body;
  
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    const emailNorm = email.trim().toLowerCase();
    
    const userExists = await User.findOne({ email: emailNorm });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    const usernameExists = await User.findOne({ username: username.trim() });
    if (usernameExists) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    const user = await User.create({
      fullName,
      companyName,
      email: emailNorm,
      phoneNumber,
      username: username.trim(),
      password, // Mongoose pre-save hook will hash this
      country,
      timezone,
      plan,
      role: 'user',
      registrationMethod: 'SELF_SIGNUP',
      registeredAt: new Date(),
      ipAddress: getIp(req),
      deviceInfo: getDeviceInfo(req),
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Auth user & get token — also records lastLogin, IP, device
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    if (user.status === 'SUSPENDED') {
      return res.status(403).json({ message: 'Account is suspended. Contact your administrator.' });
    }
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // -- SESSION LIMIT LOGIC --
    const GlobalSetting = require('../models/globalSetting.model');
    const ActiveSession = require('../models/activeSession.model');
    const crypto = require('crypto');

    let settings = await GlobalSetting.findOne({ configId: 'global_config' });
    const maxSessions = settings?.security?.multiDeviceSessionLimit || 3;
    const activeSessions = await ActiveSession.find({ userId: user._id }).sort('-loginTime');

    if (user.role !== 'SUPER_ADMIN' && activeSessions.length >= maxSessions) {
      // Create a temporary revoke token so they can revoke sessions without being fully logged in
      const revokeToken = jwt.sign({ id: user._id, role: user.role, type: 'REVOKE_ONLY' }, process.env.JWT_SECRET, { expiresIn: '15m' });
      // TEMP BYPASS: Commented out for local testing
      // return res.status(403).json({ 
      //   message: 'You have reached the maximum number of active login sessions. Please sign out from one of your existing devices to continue.',
      //   code: 'SESSION_LIMIT_REACHED',
      //   activeSessions,
      //   revokeToken
      // });
    }

    const sessionId = crypto.randomUUID();
    const ip = getIp(req);
    const geo = geoip.lookup(ip);
    const location = geo ? `${geo.city}, ${geo.country}` : 'Unknown Location';
    const deviceInfo = getDeviceInfo(req);
    const parsedUA = getParsedUA(req);

    await ActiveSession.create({
      userId: user._id,
      sessionId,
      deviceName: parsedUA.device,
      browser: parsedUA.browser,
      os: parsedUA.os,
      ipAddress: ip,
      loginTime: new Date(),
      lastActiveTime: new Date()
    });

      const loginTracking = settings?.loginTracking?.loginTracking !== false;
      if (loginTracking) {
        await LoginActivity.create({
          userId: user._id,
          adminId: user.assignedAdminId || null,
          role: user.role,
          sessionId,
          ipAddress: ip,
          device: parsedUA.device,
          browser: parsedUA.browser,
          operatingSystem: parsedUA.os,
          location,
          loginAt: new Date(),
          lastActiveAt: new Date()
        });
      }
    // -- END SESSION LIMIT LOGIC --

    // Record login activity (without triggering password re-hash)
    await User.findByIdAndUpdate(user._id, {
      lastLogin: new Date(),
      lastLoginIp: getIp(req),
      deviceInfo: getDeviceInfo(req),
    });

    let brandLogo = user.brandLogo || '';
    if (user.role === 'USER' && user.assignedAdminId) {
      const admin = await User.findById(user.assignedAdminId).select('brandLogo');
      if (admin && admin.brandLogo) {
        brandLogo = admin.brandLogo;
      }
    }

    const token = generateToken(user._id, user.role, sessionId);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      token, // Also return token for backward compatibility if needed temporarily
      companyLogo: brandLogo
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: 'User logged out successfully' });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'subscriptionId',
      populate: { path: 'planId' }
    });
    let brandLogo = user.brandLogo || '';
    if (user.role === 'USER' && user.assignedAdminId) {
      const admin = await User.findById(user.assignedAdminId).select('brandLogo');
      if (admin && admin.brandLogo) {
        brandLogo = admin.brandLogo;
      }
    }
    const userObj = user.toObject();
    userObj.companyLogo = brandLogo;

    // Filter allocatedPlatforms against Global Settings so the frontend UI automatically hides disabled platforms
    try {
      const settings = await GlobalSetting.findOne({ configId: 'global_config' });
      if (settings && settings.social && settings.social.platforms && userObj.allocatedPlatforms) {
        userObj.allocatedPlatforms = userObj.allocatedPlatforms.filter(platform => {
          // Check if platform is explicitly disabled globally
          const conf = settings.social.platforms[platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase()] || 
                       settings.social.platforms[platform] || 
                       settings.social.platforms[platform.toLowerCase()];
          return conf?.enabled !== false;
        });
      }
    } catch (err) {
      console.error("Failed to filter allocatedPlatforms globally:", err);
    }

    res.json(userObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
