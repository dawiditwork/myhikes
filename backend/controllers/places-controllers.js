const fs = require('fs');
const path = require('path');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');
const Report = require('../models/report');
const Notification = require('../models/notification');
const { uploadImage, deleteImage } = require('../config/cloudinary');

const createNotification = data => Notification.create(data).catch(err => {
  console.error('Failed to create notification:', err);
  return null;
});



// Pobierz wszystkie miejsca
const getAllPlaces = async (req, res, next) => {
  let places;

  try {
    places = await Place.find()
      .populate('creator', 'name image')
      .sort({ createdAt: -1 });
  } catch (err) {
    console.error('Error fetching all places:', err);

    return next(
      new HttpError(
        'Fetching places failed, please try again later.',
        500
      )
    );
  }

  res.status(200).json({
    places: places.map(place =>
      place.toObject({ getters: true })
    )
  });
};


// Pobierz miejsce po ID
const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId)
      .populate('creator', 'name image')
      .populate('comments.author', 'name image')
      .populate('conditionReports.author', 'name image');
  } catch (err) {
    return next(new HttpError('Something went wrong, could not find a place.', 500));
  }

  if (!place) {
    return next(new HttpError('Could not find place for the provided id.', 404));
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const getPopulatedPlace = placeId => Place.findById(placeId)
  .populate('creator', 'name image')
  .populate('comments.author', 'name image')
  .populate('conditionReports.author', 'name image');

const addConditionReport = async (req, res, next) => {
  const allowed = ['mud', 'snow', 'ice', 'closed_section', 'parking_issue'];
  const condition = req.body.condition;
  const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
  if (!allowed.includes(condition) || note.length > 300) {
    return next(new HttpError('Please choose a valid condition and keep the note under 300 characters.', 422));
  }
  let place;
  try { place = await Place.findById(req.params.pid); }
  catch (err) { return next(new HttpError('Reporting conditions failed.', 500)); }
  if (!place) return next(new HttpError('Could not find place.', 404));
  const currentUntil = Date.now() - (14 * 24 * 60 * 60 * 1000);
  const duplicate = place.conditionReports.some(report =>
    report.author.toString() === req.userData.userId &&
    report.condition === condition &&
    new Date(report.createdAt).getTime() >= currentUntil
  );
  if (duplicate) {
    return next(new HttpError('You already reported this condition for this trail.', 409));
  }
  place.conditionReports.push({ condition, note, author: req.userData.userId });
  try { await place.save(); place = await getPopulatedPlace(place.id); }
  catch (err) { return next(new HttpError('Reporting conditions failed.', 500)); }
  res.status(201).json({ place: place.toObject({ getters: true }) });
};

const deleteConditionReport = async (req, res, next) => {
  let place;
  try { place = await Place.findById(req.params.pid); }
  catch (err) { return next(new HttpError('Deleting report failed.', 500)); }
  if (!place) return next(new HttpError('Could not find place.', 404));
  const report = place.conditionReports.id(req.params.rid);
  if (!report) return next(new HttpError('Could not find report.', 404));
  if (report.author.toString() !== req.userData.userId) return next(new HttpError('You can only delete your own reports.', 403));
  report.deleteOne();
  try { await place.save(); place = await getPopulatedPlace(place.id); }
  catch (err) { return next(new HttpError('Deleting report failed.', 500)); }
  res.json({ place: place.toObject({ getters: true }) });
};

const confirmConditionReport = async (req, res, next) => {
  let place;
  try { place = await Place.findById(req.params.pid); }
  catch (err) { return next(new HttpError('Confirming report failed.', 500)); }
  if (!place) return next(new HttpError('Could not find place.', 404));
  const report = place.conditionReports.id(req.params.rid);
  if (!report) return next(new HttpError('Could not find report.', 404));
  const userId = req.userData.userId;
  if (report.author.toString() === userId) return next(new HttpError('You cannot confirm your own report.', 422));
  const confirmed = report.confirmedBy.some(id => id.toString() === userId);
  if (confirmed) report.confirmedBy.pull(userId); else report.confirmedBy.push(userId);
  try {
    await place.save();
    if (!confirmed) await createNotification({ recipient: report.author, actor: userId, type: 'condition_confirm', message: 'confirmed your trail condition report.', place: place._id });
    place = await getPopulatedPlace(place.id);
  }
  catch (err) { return next(new HttpError('Confirming report failed.', 500)); }
  res.json({ place: place.toObject({ getters: true }), confirmed: !confirmed });
};

const addComment = async (req, res, next) => {
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!text || text.length > 1000) {
    return next(new HttpError('Comment must contain between 1 and 1000 characters.', 422));
  }

  let place;
  try {
    place = await Place.findById(req.params.pid);
  } catch (err) {
    return next(new HttpError('Adding comment failed.', 500));
  }
  if (!place) return next(new HttpError('Could not find place.', 404));

  place.comments.push({ text, author: req.userData.userId });
  try {
    await place.save();
    if (place.creator.toString() !== req.userData.userId) {
      await createNotification({ recipient: place.creator, actor: req.userData.userId, type: 'comment', message: 'commented on your place.', place: place._id });
    }
    place = await getPopulatedPlace(place.id);
  } catch (err) {
    return next(new HttpError('Adding comment failed.', 500));
  }

  res.status(201).json({ place: place.toObject({ getters: true }) });
};

const deleteComment = async (req, res, next) => {
  let place;
  try {
    place = await Place.findById(req.params.pid);
  } catch (err) {
    return next(new HttpError('Deleting comment failed.', 500));
  }
  if (!place) return next(new HttpError('Could not find place.', 404));

  const comment = place.comments.id(req.params.cid);
  if (!comment) return next(new HttpError('Could not find comment.', 404));
  if (comment.author.toString() !== req.userData.userId) {
    return next(new HttpError('You can only delete your own comments.', 403));
  }

  comment.deleteOne();
  try {
    await place.save();
    place = await getPopulatedPlace(place.id);
  } catch (err) {
    return next(new HttpError('Deleting comment failed.', 500));
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const ratePlace = async (req, res, next) => {
  const value = Number(req.body.value);
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return next(new HttpError('Rating must be a whole number from 1 to 5.', 422));
  }

  let place;
  try {
    place = await Place.findById(req.params.pid);
  } catch (err) {
    return next(new HttpError('Rating place failed.', 500));
  }
  if (!place) return next(new HttpError('Could not find place.', 404));

  const existingRating = place.ratings.find(
    rating => rating.user.toString() === req.userData.userId
  );
  if (existingRating) existingRating.value = value;
  else place.ratings.push({ value, user: req.userData.userId });

  try {
    await place.save();
    if (!existingRating && place.creator.toString() !== req.userData.userId) {
      await createNotification({ recipient: place.creator, actor: req.userData.userId, type: 'rating', message: `rated your place ${value} stars.`, place: place._id });
    }
    place = await getPopulatedPlace(place.id);
  } catch (err) {
    return next(new HttpError('Rating place failed.', 500));
  }

  res.json({ place: place.toObject({ getters: true }) });
};

// Pobierz miejsca danego użytkownika
const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let userWithPlaces;
  try {
    userWithPlaces = await User.findById(userId).populate('places');
  } catch (err) {
    return next(new HttpError('Fetching places failed, please try again later.', 500));
  }

  if (!userWithPlaces || userWithPlaces.places.length === 0) {
    return next(new HttpError('Could not find places for the provided user id.', 404));
  }

  res.json({
    places: userWithPlaces.places.map(place => place.toObject({ getters: true }))
  });
};

// Utwórz nowe miejsce
const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const {
    title,
    description,
    address,
    parkingAddress,
    hikeDuration,
    distanceKm,
    elevationGain,
    difficulty,
    trailStatus,
    requiredEquipment
  } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  if (!req.files || req.files.length === 0) {
    return next(new HttpError('Please provide at least one image.', 422));
  }

  // ✅ WIELE ZDJĘĆ
  const uploadedImages = [];
  try {
    for (const file of req.files) {
      uploadedImages.push(await uploadImage(file, 'myhikes/places'));
    }
  } catch (err) {
    console.error('Cloudinary upload failed:', err);
    await Promise.allSettled(uploadedImages.map(image => deleteImage(image.publicId)));
    return next(new HttpError('Uploading images failed, please try again.', 500));
  }

  const imagePaths = uploadedImages.map(image => image.url);
  const imagePublicIds = uploadedImages.map(image => image.publicId);

  const createdPlace = new Place({
    title,
    description,
    address,
    parkingAddress,
    hikeDuration: Number(hikeDuration),
    distanceKm: Number(distanceKm),
    elevationGain: Number(elevationGain),
    difficulty,
    trailStatus,
    requiredEquipment: Array.isArray(requiredEquipment) ? requiredEquipment : JSON.parse(requiredEquipment || '[]'),
    location: coordinates,
    images: imagePaths, // ⬅️ TABLICA
    imagePublicIds,
    creator: req.userData.userId
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    await Promise.allSettled(imagePublicIds.map(deleteImage));
    return next(new HttpError('Creating place failed, please try again.', 500));
  }

  if (!user) {
    await Promise.allSettled(imagePublicIds.map(deleteImage));
    return next(new HttpError('Could not find user for provided id.', 404));
  }

  let sess;
  try {
    sess = await mongoose.startSession();
    sess.startTransaction();
    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    user.completed.push(createdPlace._id);
    user.completionLogs.push({
      place: createdPlace._id,
      completedAt: new Date(),
      durationMinutes: Number(hikeDuration)
    });
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    if (sess && sess.inTransaction()) {
      await sess.abortTransaction().catch(() => {});
    }
    await Promise.allSettled(imagePublicIds.map(deleteImage));
    return next(new HttpError('Creating place failed, please try again.', 500));
  } finally {
    if (sess) await sess.endSession();
  }

  res.status(201).json({ place: createdPlace.toObject({ getters: true }) });
};

// Aktualizuj miejsce
const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError('Invalid inputs passed, please check your data.', 422));
  }

  const {
    title,
    description,
    parkingAddress,
    hikeDuration,
    distanceKm,
    elevationGain,
    difficulty,
    trailStatus,
    requiredEquipment
  } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    return next(new HttpError('Something went wrong, could not update place.', 500));
  }

  if (place.creator.toString() !== req.userData.userId) {
    return next(new HttpError('You are not allowed to edit this place.', 401));
  }

  place.title = title;
  place.description = description;
  place.parkingAddress = parkingAddress;
  place.hikeDuration = Number(hikeDuration);
  place.distanceKm = Number(distanceKm);
  place.elevationGain = Number(elevationGain);
  place.difficulty = difficulty;
  place.trailStatus = trailStatus;
  place.requiredEquipment = Array.isArray(requiredEquipment) ? requiredEquipment : [];

  try {
    await place.save();
  } catch (err) {
    return next(new HttpError('Something went wrong, could not update place.', 500));
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

// Usuń miejsce
const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate('creator');
  } catch (err) {
    console.error('Error fetching place:', err);
    return next(new HttpError('Something went wrong, could not delete place.', 500));
  }

  if (!place) {
    return next(new HttpError('Could not find place for this id.', 404));
  }

  if (!place.creator || place.creator.id !== req.userData.userId) {
    return next(new HttpError('You are not allowed to delete this place.', 401));
  }

  const imagePaths = Array.isArray(place.images) ? place.images : [];
  const imagePublicIds = Array.isArray(place.imagePublicIds) ? place.imagePublicIds : [];

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await place.deleteOne({ session: sess });
    place.creator.places.pull(place._id);
    await place.creator.save({ session: sess });
    await User.updateMany({}, { $pull: { favorites: place._id, wantToVisit: place._id, plannedVisits: { place: place._id }, completed: place._id, completionLogs: { place: place._id } } }, { session: sess });
    await Report.deleteMany({ place: place._id }, { session: sess });
    await Notification.deleteMany({ place: place._id }, { session: sess });
    await sess.commitTransaction();
  } catch (err) {
    console.error('Error deleting place:', err);
    return next(new HttpError('Something went wrong, could not delete place.', 500));
  }

  // Usuń plik obrazka, jeśli istnieje
  await Promise.allSettled(imagePublicIds.map(deleteImage));

  imagePaths.filter(imagePath => !/^https?:\/\//i.test(imagePath)).forEach(imagePath => {
    fs.unlink(path.join(__dirname, '..', imagePath), err => {
      if (err && err.code !== 'ENOENT') {
        console.error('Failed to delete legacy place image:', err);
      }
    });
  });

  res.status(200).json({ message: 'Deleted place.' });
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
exports.getAllPlaces = getAllPlaces;
exports.addComment = addComment;
exports.deleteComment = deleteComment;
exports.ratePlace = ratePlace;
exports.addConditionReport = addConditionReport;
exports.deleteConditionReport = deleteConditionReport;
exports.confirmConditionReport = confirmConditionReport;
