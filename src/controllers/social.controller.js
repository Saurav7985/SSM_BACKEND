const SocialAccount = require('../models/socialAccount.model');

// @desc    Mock connect a social account
// @route   POST /api/social/connect
// @access  Private
exports.connectSocialAccount = async (req, res) => {
  try {
    const { platform, accountId, accountName } = req.body;

    // Notice: Because socialMiddleware ran before this, we are absolutely certain
    // that the Global Settings allow this platform, and the User has permission.

    const newAccount = await SocialAccount.create({
      userId: req.user._id,
      platform,
      accountId: accountId || `mock-id-${Date.now()}`,
      accountName: accountName || `Mock ${platform} Account`,
      accessToken: 'mock_access_token_' + Date.now()
    });

    res.status(201).json({
      message: `Successfully connected to ${platform}.`,
      account: newAccount
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This social account is already connected.' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user's connected social accounts
// @route   GET /api/social/accounts
// @access  Private
exports.getSocialAccounts = async (req, res) => {
  try {
    const accounts = await SocialAccount.find({ userId: req.user._id });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mock publish a post
// @route   POST /api/social/publish
// @access  Private
exports.publishPost = async (req, res) => {
  try {
    const { platform, content } = req.body;

    // Middleware already verified platform is enabled globally & for user

    // Verify user actually connected this platform
    const account = await SocialAccount.findOne({ userId: req.user._id, platform });
    if (!account) {
      return res.status(400).json({ message: `You have not connected a ${platform} account yet.` });
    }

    // Mock publishing logic...
    res.json({
      message: `Successfully published to ${platform}!`,
      content
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
