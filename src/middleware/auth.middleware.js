const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

const protect = async (req, res, next) => {
  let token;

  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type === 'REVOKE_ONLY') {
        if (!req.originalUrl.includes('/api/sessions/')) {
          return res.status(403).json({ message: 'Token restricted to session revocation only' });
        }
      } else if (decoded.sessionId) {
        const ActiveSession = require('../models/activeSession.model');
        const sessionExists = await ActiveSession.findOne({ sessionId: decoded.sessionId });
        if (!sessionExists) {
          return res.status(401).json({ message: 'Session expired or revoked. Please login again.' });
        }
        req.sessionId = decoded.sessionId;
      }

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }
      
      if (req.user.status === 'SUSPENDED') {
        return res.status(403).json({ message: 'Account is suspended' });
      }

      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    const userRole = String(req.user.role).trim();
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        message: `User role ${userRole} is not authorized to access this route` 
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
