const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const commentSchema = new Schema({
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  author: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
  confirmedBy: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

const ratingSchema = new Schema({
  value: { type: Number, required: true, min: 1, max: 5 },
  user: { type: mongoose.Types.ObjectId, required: true, ref: 'User' }
});

const conditionReportSchema = new Schema({
  condition: {
    type: String,
    required: true,
    enum: ['mud', 'snow', 'ice', 'closed_section', 'parking_issue']
  },
  note: { type: String, trim: true, maxlength: 300, default: '' },
  author: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
  confirmedBy: [{ type: mongoose.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

const placeSchema = new Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },

  // Zachowujemy zgodność ze starszymi miejscami z jednym zdjęciem.
  image: { type: String },

  // ✅ WIELE ZDJĘĆ (1–5)
  images: {
    type: [String],
    required: true,
    validate: {
      validator: function (value) {
        return (
          (value.length > 0 && value.length <= 5) ||
          (!value.length && Boolean(this.image))
        );
      },
      message: 'Place must have between 1 and 5 images'
    }
  },

  imagePublicIds: {
    type: [String],
    default: []
  },

  address: { type: String, required: true, trim: true, maxlength: 300 },
  parkingAddress: { type: String, trim: true, maxlength: 300 },
  hikeDuration: { type: Number, min: 1 },
  distanceKm: { type: Number, min: 0.1 },
  elevationGain: { type: Number, min: 0 },
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'hard', 'expert']
  },
  trailStatus: {
    type: String,
    enum: ['open', 'caution', 'closed', 'seasonal'],
    default: 'open'
  },
  requiredEquipment: {
    type: [String],
    default: [],
    validate: {
      validator: value => value.every(item =>
        ['hiking_boots', 'poles', 'microspikes', 'helmet', 'headlamp', 'water', 'rain_jacket'].includes(item)
      ),
      message: 'Unsupported equipment value'
    }
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  creator: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
  comments: { type: [commentSchema], default: [] },
  ratings: { type: [ratingSchema], default: [] }
  ,conditionReports: { type: [conditionReportSchema], default: [] }
}, { timestamps: true });

placeSchema.index({ creator: 1, createdAt: -1 });
placeSchema.index({ difficulty: 1, createdAt: -1 });
placeSchema.index({ trailStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Place', placeSchema);
