const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },

  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true,
    minlength: 8
  },

  image: {
    type: String,
    required: true
  },

  imagePublicId: {
    type: String,
    default: null
  },

  bio: {
    type: String,
    default: '',
    maxlength: 500
  },

  location: {
    type: String,
    default: '',
    maxlength: 100
  },
  profileVisibility: { type: String, enum: ['public', 'private'], default: 'public' },
  trailLogVisibility: { type: String, enum: ['public', 'private'], default: 'public' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  // Existing accounts have no value stored for this field. The default keeps
  // them active, while signup explicitly sets new accounts to false.
  isEmailVerified: { type: Boolean, default: true },
  emailVerificationTokenHash: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },

  places: [
    {
      type: mongoose.Types.ObjectId,
      required: true,
      ref: 'Place'
    }
  ],

  favorites: [
    {
      type: mongoose.Types.ObjectId,
      ref: 'Place'
    }
  ],
  wantToVisit: [{ type: mongoose.Types.ObjectId, ref: 'Place' }],
  plannedVisits: [{
    place: { type: mongoose.Types.ObjectId, required: true, ref: 'Place' },
    plannedAt: { type: Date },
    note: { type: String, trim: true, maxlength: 300, default: '' }
  }],
  completed: [{ type: mongoose.Types.ObjectId, ref: 'Place' }],
  completionLogs: [{
    place: { type: mongoose.Types.ObjectId, required: true, ref: 'Place' },
    completedAt: { type: Date, required: true, default: Date.now },
    durationMinutes: { type: Number, min: 1, max: 1440 },
    distanceKm: { type: Number, min: 0.1, max: 1000 },
    elevationGain: { type: Number, min: 0, max: 10000 },
    note: { type: String, trim: true, maxlength: 500, default: '' }
  }]
});

// Unikalność e-maili nadal jest wymuszana przez unique: true.
// mongoose-unique-validator został usunięty, ponieważ nie działa z Mongoose 7.

module.exports = mongoose.model('User', userSchema);
