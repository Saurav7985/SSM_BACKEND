const express = require('express');
const router = express.Router();
const { connectSocialAccount, getSocialAccounts, publishPost } = require('../controllers/social.controller');
const { protect } = require('../middleware/auth.middleware');
const { requirePlatformAccess } = require('../middleware/social.middleware');

// Get all connected accounts for the user
router.get('/accounts', protect, getSocialAccounts);

// Connect to a social platform
// Applies the requirePlatformAccess middleware to ensure the Super Admin hasn't blocked it
router.post('/connect', protect, requirePlatformAccess, connectSocialAccount);

// Publish a post
router.post('/publish', protect, requirePlatformAccess, publishPost);

module.exports = router;
