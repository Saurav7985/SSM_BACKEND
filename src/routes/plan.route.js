const express = require('express');
const { protect, authorize } = require('../middleware/auth.middleware');
const { getPlans, getPlanById, createPlan, updatePlan, deletePlan, getPublicPlans } = require('../controllers/plan.controller');
const router = express.Router();
router.route('/public').get(getPublicPlans);
router.route('/').get(protect, getPlans).post(protect, authorize('SUPER_ADMIN'), createPlan);
router.route('/:id').get(protect, getPlanById).put(protect, authorize('SUPER_ADMIN'), updatePlan).delete(protect, authorize('SUPER_ADMIN'), deletePlan);
module.exports = router;
