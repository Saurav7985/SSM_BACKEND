const express = require('express');
const router = express.Router();
const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const { protect } = require('../middleware/auth.middleware');

// Helper to build the base query for notifications based on user role
const getBaseQuery = async (req) => {
  const userRole = req.user.role;
  const userId = req.user._id;

  let query = { deletedBy: { $ne: userId } };

  if (userRole === 'SUPER_ADMIN') {
    // Super admins see all notifications
    return query;
  } else if (userRole === 'ADMIN') {
    // Admins see notifications for themselves and their assigned users
    const assignedUsers = await User.find({ assignedAdminId: userId }).select('_id');
    const assignedUserIds = assignedUsers.map(u => u._id);
    assignedUserIds.push(userId); // Also their own notifications

    query.relatedUser = { $in: assignedUserIds };
    return query;
  } else {
    // Regular users see only their own notifications
    query.relatedUser = userId;
    return query;
  }
};

// @route   GET /api/notifications
// @desc    Get all notifications for the current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50, category, priority, unreadOnly } = req.query;
    
    let query = await getBaseQuery(req);

    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (unreadOnly === 'true') {
      query.readBy = { $ne: req.user._id };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('relatedUser', 'username email profilePicture');

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: notifications,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/notifications/count
// @desc    Get unread notification count
// @access  Private
router.get('/count', protect, async (req, res) => {
  try {
    const query = await getBaseQuery(req);
    query.readBy = { $ne: req.user._id };

    const count = await Notification.countDocuments(query);
    res.json({ success: true, count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a single notification as read
// @access  Private
router.put('/:id/read', protect, async (req, res) => {
  try {
    const query = await getBaseQuery(req);
    query._id = req.params.id;

    const notification = await Notification.findOne(query);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (!notification.readBy.includes(req.user._id)) {
      notification.readBy.push(req.user._id);
      await notification.save();
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all notifications as read
// @access  Private
router.put('/read-all', protect, async (req, res) => {
  try {
    const query = await getBaseQuery(req);
    // Only update those not already read
    query.readBy = { $ne: req.user._id };

    await Notification.updateMany(query, {
      $push: { readBy: req.user._id }
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete (hide) a notification for the current user
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const query = await getBaseQuery(req);
    query._id = req.params.id;

    const notification = await Notification.findOne(query);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (!notification.deletedBy.includes(req.user._id)) {
      notification.deletedBy.push(req.user._id);
      await notification.save();
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   DELETE /api/notifications/all
// @desc    Delete (hide) all notifications for the current user
// @access  Private
router.delete('/all/clear', protect, async (req, res) => {
  try {
    const query = await getBaseQuery(req);
    
    await Notification.updateMany(query, {
      $push: { deletedBy: req.user._id }
    });

    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/notifications/trigger
// @desc    Trigger a new notification (Internal / Protected)
// @access  Private
router.post('/trigger', protect, async (req, res) => {
  try {
    const { title, description, category, priority, actionLink } = req.body;
    
    const { createNotification } = require('../services/notification.service');
    
    const notification = await createNotification({
      relatedUser: req.user._id,
      title,
      description,
      category,
      priority,
      actionLink
    });

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
