const Notification = require('../models/notification.model');
const User = require('../models/user.model');

let io; // Global io instance

const setSocketIo = (socketIoInstance) => {
  io = socketIoInstance;
};

/**
 * Create a new notification and emit it in real-time
 * @param {Object} data { relatedUser, title, description, category, priority, actionLink }
 */
const createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);

    if (io) {
      const payload = {
        _id: notification._id,
        relatedUser: notification.relatedUser,
        title: notification.title,
        description: notification.description,
        category: notification.category,
        priority: notification.priority,
        actionLink: notification.actionLink,
        createdAt: notification.createdAt,
        readBy: [],
      };

      // Emit to Super Admins
      io.to('super_admins').emit('new_notification', payload);

      // If notification has a related user, emit to them and their admin
      if (data.relatedUser) {
        const user = await User.findById(data.relatedUser).select('assignedAdminId');
        
        // Emit to the user
        io.to(`user_${data.relatedUser}`).emit('new_notification', payload);
        
        // Emit to the user's assigned admin
        if (user && user.assignedAdminId) {
          io.to(`admin_${user.assignedAdminId}`).emit('new_notification', payload);
        }
      }
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

module.exports = {
  setSocketIo,
  createNotification
};
