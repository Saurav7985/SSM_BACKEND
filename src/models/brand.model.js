const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  logo: {
    type: String,
    default: ''
  },
  colors: {
    primary: { type: String, default: '#000000' },
    secondary: { type: String, default: '#ffffff' },
    accent: { type: String, default: '#F16522' }
  },
  fonts: {
    heading: { type: String, default: 'Inter' },
    body: { type: String, default: 'Inter' }
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'ARCHIVED'],
    default: 'ACTIVE'
  }
}, { timestamps: true });

brandSchema.index({ workspaceId: 1 });

module.exports = mongoose.model('Brand', brandSchema);
