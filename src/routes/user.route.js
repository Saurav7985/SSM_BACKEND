const express = require('express');
const { protect, authorize } = require('../middleware/auth.middleware');
const { 
  getUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  suspendUser, 
  activateUser, 
  resetPassword,
  manageCredits,
  updateMe,
  updateMyAvatar
} = require('../controllers/user.controller');
const upload = require('../middleware/upload.middleware');

const router = express.Router();

// Current User Profile Routes
router.patch('/me', protect, updateMe);
router.patch('/me/avatar', protect, upload.single('avatar'), updateMyAvatar);

router.route('/')
  .get(protect, authorize('SUPER_ADMIN', 'ADMIN', 'USER'), getUsers)
  .post(protect, authorize('SUPER_ADMIN', 'ADMIN'), createUser);

router.route('/:id')
  .get(protect, authorize('SUPER_ADMIN', 'ADMIN', 'USER'), getUserById)
  .put(protect, authorize('SUPER_ADMIN', 'ADMIN'), updateUser)
  .delete(protect, authorize('SUPER_ADMIN', 'ADMIN'), deleteUser);

router.patch('/:id/suspend', protect, authorize('SUPER_ADMIN', 'ADMIN'), suspendUser);
router.patch('/:id/activate', protect, authorize('SUPER_ADMIN', 'ADMIN'), activateUser);
router.patch('/:id/reset-password', protect, authorize('SUPER_ADMIN', 'ADMIN'), resetPassword);
router.post('/:id/credits', protect, authorize('SUPER_ADMIN', 'ADMIN'), manageCredits);

module.exports = router;
