const express = require('express');
const { allocateCredits, getAuditLogs, getUsers } = require('../controllers/credit.controller');
const router = express.Router();

// No auth middleware in this simple demonstration, but typically we would use protect/authorize
router.post('/allocate', allocateCredits);
router.get('/logs', getAuditLogs);
router.get('/users', getUsers);

module.exports = router;
