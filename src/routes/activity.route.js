const express = require('express');
const router = express.Router();
const { getSuperAdminActivity, getAdminActivity, getUserActivity } = require('../controllers/activity.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/super', authorize('SUPER_ADMIN'), getSuperAdminActivity);
router.get('/admin', authorize('ADMIN', 'SUPER_ADMIN'), getAdminActivity);
router.get('/me', getUserActivity);

module.exports = router;
