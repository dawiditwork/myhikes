const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Types.ObjectId, required: true, ref: 'User', index: true },
  actor: { type: mongoose.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    required: true,
    enum: ['comment', 'rating', 'condition_confirm', 'moderation_report', 'moderation_resolved', 'moderation_dismissed', 'moderation_removed']
  },
  message: { type: String, required: true, trim: true, maxlength: 240 },
  place: { type: mongoose.Types.ObjectId, ref: 'Place' },
  read: { type: Boolean, default: false, index: true }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
