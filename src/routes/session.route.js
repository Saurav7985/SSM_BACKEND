const express = require('express');
const router = express.Router();
const { 
  getMySessions, 
  logoutSession, 
  logoutOtherSessions, 
  getAdminUsersSessions, 
  getAllSessions 
} = require('../controllers/session.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/my-sessions', getMySessions);
router.delete('/others', logoutOtherSessions);
router.delete('/:sessionId', logoutSession);

// Admin route
router.get('/admin/users', authorize('ADMIN', 'SUPER_ADMIN'), getAdminUsersSessions);

// Super Admin route
router.get('/super/all', authorize('SUPER_ADMIN'), getAllSessions);

module.exports = router;
