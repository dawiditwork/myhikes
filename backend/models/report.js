const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reportSchema = new Schema({
  targetType: { type: String, required: true, enum: ['place', 'comment', 'condition'] },
  place: { type: mongoose.Types.ObjectId, required: true, ref: 'Place' },
  targetId: { type: String, required: true },
  targetLabel: { type: String, trim: true, maxlength: 160, default: '' },
  reason: { type: String, required: true, enum: ['incorrect', 'unsafe', 'spam', 'abuse', 'other'] },
  details: { type: String, trim: true, maxlength: 500, default: '' },
  reporter: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
  status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
  reviewedBy: { type: mongoose.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date }
}, { timestamps: true });

reportSchema.index({ reporter: 1, targetType: 1, targetId: 1, status: 1 });
reportSchema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model('Report', reportSchema);
