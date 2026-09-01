const express = require('express');
const { protect, authorize } = require('../middleware/auth.middleware');
const { createSubscription, useQuota } = require('../controllers/subscription.controller');

const router = express.Router();

router.route('/')
  .post(protect, authorize('SUPER_ADMIN'), createSubscription);

router.post('/use', protect, useQuota);

module.exports = router;
