const Subscription = require('../models/subscription.model');
const Plan = require('../models/plan.model');
const User = require('../models/user.model');

// @desc    Assign subscription to user
// @route   POST /api/subscriptions
// @access  Private/SuperAdmin
exports.createSubscription = async (req, res) => {
  const { userId, planId } = req.body;

  try {
    const user = await User.findById(userId);
    const plan = await Plan.findById(planId);

    if (!user || !plan) {
      return res.status(404).json({ message: 'User or Plan not found' });
    }

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const subscription = await Subscription.create({
      userId,
      planId,
      endDate
    });

    user.subscriptionId = subscription._id;
    await user.save();

    res.status(201).json(subscription);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Use subscription quota
// @route   POST /api/subscriptions/use
// @access  Private
exports.useQuota = async (req, res) => {
  const { action, amount = 1 } = req.body;
  const user = req.user;

  try {
    if (!user.subscriptionId) {
      return res.status(403).json({ message: 'No active subscription found. Please upgrade your plan.' });
    }

    const sub = await Subscription.findById(user.subscriptionId).populate('planId');
    
    if (!sub || sub.status !== 'ACTIVE' || sub.endDate < new Date()) {
      return res.status(403).json({ message: 'Your subscription has expired or is inactive. Please renew.' });
    }

    const plan = sub.planId;
    const limits = plan.limits;
    const usage = sub.usage;
    let allowed = false;
    let limitMessage = '';

    switch (action) {
      case 'POST_PUBLISHED':
        allowed = (usage.postsPublished + amount) <= limits.maxPostsPerMonth;
        limitMessage = 'You have reached your monthly post limit.';
        if (allowed) sub.usage.postsPublished += amount;
        break;
      case 'POST_SCHEDULED':
        allowed = (usage.postsScheduled + amount) <= limits.maxScheduledPosts;
        limitMessage = 'You have reached your scheduled post limit.';
        if (allowed) sub.usage.postsScheduled += amount;
        break;
      case 'AI_CREDIT':
        allowed = (usage.aiCreditsUsed + amount) <= limits.aiCredits;
        limitMessage = 'Your AI credits have been exhausted.';
        if (allowed) sub.usage.aiCreditsUsed += amount;
        break;
      case 'AI_IMAGE':
        allowed = (usage.aiImageGenerationsUsed + amount) <= limits.aiImageGenerations;
        limitMessage = 'Your AI image limit has been exhausted.';
        if (allowed) sub.usage.aiImageGenerationsUsed += amount;
        break;
      case 'AI_VIDEO':
        allowed = (usage.aiVideoGenerationsUsed + amount) <= limits.aiVideoGenerations;
        limitMessage = 'Your AI video limit has been exhausted.';
        if (allowed) sub.usage.aiVideoGenerationsUsed += amount;
        break;
      case 'STORAGE':
        allowed = (usage.storageUsedMB + amount) <= limits.storageLimitMB;
        limitMessage = 'You have reached your storage limit.';
        if (allowed) sub.usage.storageUsedMB += amount;
        break;
      default:
        return res.status(400).json({ message: 'Invalid action type' });
    }

    if (!allowed) {
      return res.status(403).json({ message: limitMessage });
    }

    await sub.save();
    res.json({ message: 'Quota used successfully', usage: sub.usage });

  } catch (error) {
    console.error('useQuota Error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
