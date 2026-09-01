const mongoose = require('mongoose');

const creditTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    enum: ['ADD', 'DEDUCT'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  adminPostBalance: {
    type: Number,
    required: true
  },
  userPostBalance: {
    type: Number,
    required: true
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED'],
    default: 'SUCCESS'
  }
}, { timestamps: true });

module.exports = mongoose.model('CreditTransaction', creditTransactionSchema);
