const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLog.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Audit Logs routes - Accessible only by SUPER_ADMIN
router.get('/', protect, authorize('SUPER_ADMIN'), auditLogController.getAuditLogs);

module.exports = router;
