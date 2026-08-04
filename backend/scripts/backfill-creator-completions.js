require('dotenv').config();
const mongoose = require('mongoose');
const Place = require('../models/place');
const User = require('../models/user');

const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured.');
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find().select('places completed completionLogs');
  let added = 0;

  for (const user of users) {
    const authoredPlaces = await Place.find({ creator: user._id }).select('_id hikeDuration createdAt');
    for (const place of authoredPlaces) {
      const alreadyLogged = user.completionLogs.some(log => log.place.toString() === place.id);
      if (alreadyLogged) continue;
      if (!user.completed.some(id => id.toString() === place.id)) user.completed.push(place._id);
      user.completionLogs.push({
        place: place._id,
        completedAt: place.createdAt || new Date(),
        durationMinutes: place.hikeDuration || undefined
      });
      added += 1;
    }
    await user.save();
  }

  await mongoose.disconnect();
  console.log(`Added ${added} creator completion log entries.`);
};

run().catch(async error => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
