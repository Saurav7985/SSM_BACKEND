const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  // Only one config document should exist, so we can hardcode an ID or use a singleton approach
  configId: {
    type: String,
    default: 'global_config',
    unique: true
  },
  sessionLimits: {
    SUPER_ADMIN: {
      type: Number,
      default: 3,
    },
    ADMIN: {
      type: Number,
      default: 2,
    },
    USER: {
      type: Number,
      default: 2,
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
