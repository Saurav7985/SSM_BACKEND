const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Publicly accessible platform statuses (for Next.js API & Frontend)
router.get('/public-platforms', settingsController.getPublicPlatforms);

// Settings routes - Accessible only by SUPER_ADMIN
router.get('/', protect, authorize('SUPER_ADMIN'), settingsController.getSettings);
router.put('/', protect, authorize('SUPER_ADMIN'), settingsController.updateSettings);

module.exports = router;
