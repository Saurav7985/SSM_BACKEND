const express = require('express');
const { protect, authorize } = require('../middleware/auth.middleware');
const { 
  getAdmins, 
  getAdminById, 
  createAdmin, 
  updateAdmin, 
  deleteAdmin, 
  resetPassword,
  updateLogo
} = require('../controllers/admin.controller');

const router = express.Router();

router.route('/')
  .get(protect, authorize('SUPER_ADMIN'), getAdmins)
  .post(protect, authorize('SUPER_ADMIN'), createAdmin);

router.route('/:id')
  .get(protect, authorize('SUPER_ADMIN'), getAdminById)
  .put(protect, authorize('SUPER_ADMIN'), updateAdmin)
  .delete(protect, authorize('SUPER_ADMIN'), deleteAdmin);

router.patch('/:id/reset-password', protect, authorize('SUPER_ADMIN'), resetPassword);
router.patch('/:id/logo', protect, authorize('SUPER_ADMIN'), updateLogo);

module.exports = router;
