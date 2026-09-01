const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // If null, it's a global system notification
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: [
      'Account', 'Subscription', 'Credits', 'Publishing', 
      'AI', 'Social Media', 'Support', 'Payments', 'Security', 'System'
    ],
    default: 'System'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Low'
  },
  actionLink: {
    type: String,
    default: ''
  },
  // Arrays storing user IDs who have interacted with this notification
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

notificationSchema.index({ relatedUser: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
