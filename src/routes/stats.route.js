const express = require('express');
const { protect, authorize } = require('../middleware/auth.middleware');
const { getStats } = require('../controllers/stats.controller');
const router = express.Router();
router.get('/', protect, authorize('SUPER_ADMIN'), getStats);
module.exports = router;
