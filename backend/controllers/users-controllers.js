const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');

const HttpError = require('../models/http-error');
const User = require('../models/user');
const Place = require('../models/place');
const Report = require('../models/report');
const Notification = require('../models/notification');
const { sendVerificationEmail } = require('../util/email');
const { uploadImage, deleteImage } = require('../config/cloudinary');

const createEmailVerification = user => {
  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return token;
};

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({ isEmailVerified: { $ne: false } }).select('name image places profileVisibility role email');
  } catch (err) {
    console.error('ERROR FETCHING USERS:', err);
    return next(new HttpError(
      'Fetching users failed, please try again later.',
      500
    ));
  }
  const configuredAdmins = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  const publicUsers = users
    .filter(user => user.role !== 'admin' && !configuredAdmins.includes(user.email.toLowerCase()))
    .map(user => {
      const publicUser = user.toObject({ getters: true });
      delete publicUser.email;
      delete publicUser.role;
      return publicUser;
    });
  res.json({ users: publicUsers });
};

const getUserProfile = async (req, res, next) => {
  let user;
  let places;
  try {
    [user, places] = await Promise.all([
      User.findById(req.params.uid, '-password -favorites').populate([
        { path: 'wantToVisit', populate: { path: 'creator', select: 'name image' } },
        { path: 'plannedVisits.place', populate: { path: 'creator', select: 'name image' } },
        { path: 'completed', populate: { path: 'creator', select: 'name image' } },
        { path: 'completionLogs.place', populate: { path: 'creator', select: 'name image' } }
      ]),
      Place.find({ creator: req.params.uid }).sort({ _id: -1 })
    ]);
  } catch (err) {
    return next(new HttpError('Fetching profile failed.', 500));
  }

  if (!user) return next(new HttpError('Could not find user.', 404));
  const isOwner = Boolean(req.userData && req.userData.userId === user.id);
  const configuredAdmins = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  const isAdminAccount = user.role === 'admin' || configuredAdmins.includes(user.email.toLowerCase());
  if (isAdminAccount && !isOwner) return next(new HttpError('Could not find user.', 404));
  if (user.profileVisibility === 'private' && !isOwner) {
    return res.json({
      profile: { id: user.id, name: user.name, image: user.image, location: user.location },
      isPrivate: true
    });
  }
  const canViewTrailLog = isOwner || user.trailLogVisibility !== 'private';
  const profile = user.toObject({ getters: true });
  ['email', 'password', 'favorites', 'places', 'wantToVisit', 'plannedVisits', 'completed', 'completionLogs'].forEach(field => delete profile[field]);
  if (isOwner && isAdminAccount) profile.role = 'admin';
  if (!isOwner) delete profile.role;

  const ratingValues = places.reduce((all, place) => {
    return all.concat((place.ratings || []).map(rating => rating.value));
  }, []);
  const averageRating = ratingValues.length
    ? ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length
    : 0;
  const validLogs = (user.completionLogs || []).filter(log => log.place);
  const logsWithDistance = validLogs.filter(log => log.distanceKm != null || log.place.distanceKm != null);
  const logsWithElevation = validLogs.filter(log => log.elevationGain != null || log.place.elevationGain != null);
  const totalDistanceKm = logsWithDistance.reduce((sum, log) => sum + (log.distanceKm != null ? log.distanceKm : log.place.distanceKm), 0);
  const totalElevationGain = logsWithElevation.reduce((sum, log) => sum + (log.elevationGain != null ? log.elevationGain : log.place.elevationGain), 0);
  const totalDurationMinutes = validLogs.reduce((sum, log) => sum + (log.durationMinutes || 0), 0);
  const monthlyMap = validLogs.reduce((months, log) => {
    const date = new Date(log.completedAt);
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    if (!months[key]) months[key] = { month: key, completions: 0, distanceKm: 0, elevationGain: 0, durationMinutes: 0 };
    months[key].completions += 1;
    months[key].distanceKm += log.distanceKm != null ? log.distanceKm : (log.place.distanceKm || 0);
    months[key].elevationGain += log.elevationGain != null ? log.elevationGain : (log.place.elevationGain || 0);
    months[key].durationMinutes += log.durationMinutes || 0;
    return months;
  }, {});
  const monthlyStats = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);

  res.json({
    profile,
    places: places.map(place => place.toObject({ getters: true })),
    stats: {
      placeCount: places.length,
      ratingCount: ratingValues.length,
      averageRating,
      wantToVisitCount: (user.wantToVisit || []).filter(Boolean).length,
      completedCount: canViewTrailLog ? (validLogs.length || (user.completed || []).filter(Boolean).length) : null,
      totalDistanceKm: canViewTrailLog ? totalDistanceKm : null,
      totalElevationGain: canViewTrailLog ? totalElevationGain : null,
      hasDistanceData: canViewTrailLog && logsWithDistance.length > 0,
      hasElevationData: canViewTrailLog && logsWithElevation.length > 0,
      totalDurationMinutes: canViewTrailLog ? totalDurationMinutes : null,
      monthlyStats: canViewTrailLog ? monthlyStats : []
    },
    collections: {
      wantToVisit: (user.wantToVisit || []).filter(Boolean).map(place => place.toObject({ getters: true })),
      plannedVisits: (user.plannedVisits || []).filter(plan => plan.place).map(plan => ({
        id: plan.id,
        place: plan.place.toObject({ getters: true }),
        plannedAt: plan.plannedAt,
        note: plan.note
      })).sort((a, b) => (a.plannedAt ? new Date(a.plannedAt) : Infinity) - (b.plannedAt ? new Date(b.plannedAt) : Infinity)),
      completed: canViewTrailLog ? (user.completed || []).filter(Boolean).map(place => place.toObject({ getters: true })) : [],
      completionLogs: canViewTrailLog ? (user.completionLogs || []).filter(log => log.place).map(log => ({
        id: log.id,
        place: log.place.toObject({ getters: true }),
        completedAt: log.completedAt,
        durationMinutes: log.durationMinutes,
        distanceKm: log.distanceKm,
        elevationGain: log.elevationGain,
        note: log.note
      })).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)) : []
    },
    privacy: { isOwner, canViewTrailLog }
  });
};

const getAccountSettings = async (req, res, next) => {
  let user;
  try { user = await User.findById(req.userData.userId).select('email profileVisibility trailLogVisibility'); }
  catch (err) { return next(new HttpError('Fetching account settings failed.', 500)); }
  if (!user) return next(new HttpError('Could not find user.', 404));
  res.json({ settings: { email: user.email, profileVisibility: user.profileVisibility, trailLogVisibility: user.trailLogVisibility } });
};

const updateAccountSettings = async (req, res, next) => {
  const allowed = ['public', 'private'];
  if (!allowed.includes(req.body.profileVisibility) || !allowed.includes(req.body.trailLogVisibility)) return next(new HttpError('Please choose valid privacy settings.', 422));
  let user;
  try { user = await User.findById(req.userData.userId); }
  catch (err) { return next(new HttpError('Updating account settings failed.', 500)); }
  if (!user) return next(new HttpError('Could not find user.', 404));
  user.profileVisibility = req.body.profileVisibility;
  user.trailLogVisibility = req.body.trailLogVisibility;
  try { await user.save(); }
  catch (err) { return next(new HttpError('Updating account settings failed.', 500)); }
  res.json({ settings: { email: user.email, profileVisibility: user.profileVisibility, trailLogVisibility: user.trailLogVisibility } });
};

const changePassword = async (req, res, next) => {
  const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
  if (newPassword.length < 8) return next(new HttpError('New password must contain at least 8 characters.', 422));
  let user;
  try { user = await User.findById(req.userData.userId); }
  catch (err) { return next(new HttpError('Changing password failed.', 500)); }
  if (!user) return next(new HttpError('Could not find user.', 404));
  let valid;
  try { valid = await bcrypt.compare(currentPassword, user.password); }
  catch (err) { return next(new HttpError('Changing password failed.', 500)); }
  if (!valid) return next(new HttpError('Current password is incorrect.', 403));
  try { user.password = await bcrypt.hash(newPassword, 12); await user.save(); }
  catch (err) { return next(new HttpError('Changing password failed.', 500)); }
  res.json({ message: 'Password changed successfully.' });
};

const updateProfile = async (req, res, next) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : '';
  const location = typeof req.body.location === 'string' ? req.body.location.trim() : '';

  if (!name || name.length > 80 || bio.length > 500 || location.length > 100) {
    return next(new HttpError('Please check your profile details.', 422));
  }

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    return next(new HttpError('Updating profile failed.', 500));
  }
  if (!user) return next(new HttpError('Could not find user.', 404));

  user.name = name;
  user.bio = bio;
  user.location = location;

  const previousImage = user.image;
  const previousImagePublicId = user.imagePublicId;
  let uploadedImage;

  if (req.file) {
    try {
      uploadedImage = await uploadImage(req.file, 'myhikes/avatars');
      user.image = uploadedImage.url;
      user.imagePublicId = uploadedImage.publicId;
    } catch (err) {
      console.error('Cloudinary avatar upload failed:', err);
      return next(new HttpError('Uploading profile image failed.', 500));
    }
  }

  try {
    await user.save();
  } catch (err) {
    if (uploadedImage) await deleteImage(uploadedImage.publicId).catch(() => {});
    return next(new HttpError('Updating profile failed.', 500));
  }

  if (uploadedImage && previousImagePublicId) {
    await deleteImage(previousImagePublicId).catch(err => {
      console.error('Failed to delete previous profile image:', err);
    });
  } else if (uploadedImage && previousImage && !/^https?:\/\//i.test(previousImage) &&
      previousImage !== 'uploads/images/default-avatar.png') {
    fs.unlink(path.join(__dirname, '..', previousImage), err => {
      if (err && err.code !== 'ENOENT') console.error('Failed to delete previous profile image:', err);
    });
  }

  const profile = user.toObject({ getters: true });
  delete profile.password;
  delete profile.favorites;
  res.json({ profile });
};

const deleteAccount = async (req, res, next) => {
  const userId = req.userData.userId;

  let user;
  let places;
  try {
    [user, places] = await Promise.all([
      User.findById(userId),
      Place.find({ creator: userId }).select('images image imagePublicIds')
    ]);
  } catch (err) {
    return next(new HttpError('Deleting account failed.', 500));
  }

  if (!user) return next(new HttpError('Could not find user.', 404));

  const placeIds = places.map(place => place._id);

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    await Place.deleteMany({ creator: userId }, { session });
    await Report.deleteMany({ $or: [{ reporter: userId }, { place: { $in: placeIds } }] }, { session });
    await Notification.deleteMany({ $or: [{ recipient: userId }, { actor: userId }, { place: { $in: placeIds } }] }, { session });
    await Place.updateMany(
      {},
      {
        $pull: {
          comments: { author: userId },
          ratings: { user: userId },
          conditionReports: { author: userId }
        }
      },
      { session }
    );
    await Place.updateMany(
      { 'conditionReports.confirmedBy': userId },
      { $pull: { 'conditionReports.$[].confirmedBy': userId } },
      { session }
    );
    if (placeIds.length) {
      await User.updateMany(
        { _id: { $ne: userId } },
        { $pull: { favorites: { $in: placeIds }, wantToVisit: { $in: placeIds }, plannedVisits: { place: { $in: placeIds } }, completed: { $in: placeIds }, completionLogs: { place: { $in: placeIds } } } },
        { session }
      );
    }
    await User.deleteOne({ _id: userId }, { session });

    await session.commitTransaction();
    await session.endSession();
  } catch (err) {
    return next(new HttpError('Deleting account failed.', 500));
  }

  const cloudinaryIds = places.reduce((ids, place) => {
    if (Array.isArray(place.imagePublicIds)) ids.push(...place.imagePublicIds);
    return ids;
  }, []);
  if (user.imagePublicId) cloudinaryIds.push(user.imagePublicId);

  await Promise.allSettled([...new Set(cloudinaryIds)].map(deleteImage));

  const filesToDelete = places.reduce((files, place) => {
    if (Array.isArray(place.images)) files.push(...place.images);
    if (place.image) files.push(place.image);
    return files;
  }, []);

  if (user.image && user.image !== 'uploads/images/default-avatar.png') {
    filesToDelete.push(user.image);
  }

  [...new Set(filesToDelete)]
    .filter(filePath => !/^https?:\/\//i.test(filePath))
    .forEach(filePath => {
    fs.unlink(path.join(__dirname, '..', filePath), err => {
      if (err && err.code !== 'ENOENT') {
        console.error('Failed to delete account image:', err);
      }
    });
    });

  res.status(200).json({ message: 'Account deleted.' });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(
      'Invalid inputs passed, please check your data.',
      422
    ));
  }

  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = req.body.password;

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    console.error('ERROR CHECKING EXISTING USER:', err);
    return next(new HttpError(
      'Signing up failed, please try again later.',
      500
    ));
  }

  if (existingUser) {
    return next(new HttpError(
      'User exists already, please login instead.',
      422
    ));
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    console.error('ERROR HASHING PASSWORD:', err);
    return next(new HttpError(
      'Could not create user, please try again.',
      500
    ));
  }

  let uploadedImage;
  if (req.file) {
    try {
      uploadedImage = await uploadImage(req.file, 'myhikes/avatars');
    } catch (err) {
      console.error('Cloudinary avatar upload failed:', err);
      return next(new HttpError('Uploading profile image failed.', 500));
    }
  }

  let createdUser;
  try {
    createdUser = new User({
      name,
      email,
      password: hashedPassword,
      image: uploadedImage ? uploadedImage.url : 'uploads/images/default-avatar.png',
      imagePublicId: uploadedImage ? uploadedImage.publicId : null,
      places: [],
      isEmailVerified: false
    });
    const verificationToken = createEmailVerification(createdUser);
    await createdUser.save();

    try {
      await sendVerificationEmail({ email: createdUser.email, name: createdUser.name, token: verificationToken });
    } catch (emailError) {
      console.error('ERROR SENDING VERIFICATION EMAIL:', emailError.message);
      return res.status(201).json({
        email: createdUser.email,
        verificationRequired: true,
        emailSent: false,
        message: 'Account created, but the verification email could not be sent. Please try resending it.'
      });
    }
  } catch (err) {
    console.error('ERROR SAVING USER:', err);
    if (uploadedImage) await deleteImage(uploadedImage.publicId).catch(() => {});
    if (err && err.code === 11000) return next(new HttpError('User exists already, please login instead.', 422));
    return next(new HttpError(
      'Signing up failed, please try again later.',
      500
    ));
  }

  res.status(201).json({
    email: createdUser.email,
    verificationRequired: true,
    emailSent: true,
    message: 'Account created. Check your email to activate it.'
  });
};

const verifyEmail = async (req, res, next) => {
  const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!email || !/^[a-f0-9]{64}$/i.test(token)) return next(new HttpError('This verification link is invalid.', 400));

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  let user;
  try {
    user = await User.findOne({ email }).select('+emailVerificationTokenHash +emailVerificationExpires');
  } catch (err) {
    return next(new HttpError('Email verification failed, please try again.', 500));
  }
  if (user && user.isEmailVerified) return res.json({ message: 'This email address is already verified. You can log in.' });
  if (!user || user.emailVerificationTokenHash !== tokenHash ||
      !user.emailVerificationExpires || user.emailVerificationExpires <= new Date()) {
    return next(new HttpError('This verification link is invalid or has expired.', 400));
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  try { await user.save(); }
  catch (err) { return next(new HttpError('Email verification failed, please try again.', 500)); }
  res.json({ message: 'Email verified. You can now log in.' });
};

const resendVerificationEmail = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new HttpError('Please enter a valid email address.', 422));
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) return next(new HttpError('Please enter a valid email address.', 422));

  let user;
  try { user = await User.findOne({ email }).select('+emailVerificationTokenHash +emailVerificationExpires'); }
  catch (err) { return next(new HttpError('Could not resend the verification email.', 500)); }

  // The generic response prevents account enumeration.
  if (!user || user.isEmailVerified) {
    return res.json({ message: 'If an unverified account exists, a new verification email has been sent.' });
  }

  const token = createEmailVerification(user);
  try {
    await sendVerificationEmail({ email: user.email, name: user.name, token });
    await user.save();
  } catch (err) {
    console.error('ERROR RESENDING VERIFICATION EMAIL:', err.message);
    return next(new HttpError('The verification email could not be sent. Please try again later.', 503));
  }
  res.json({ message: 'If an unverified account exists, a new verification email has been sent.' });
};

const login = async (req, res, next) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (!email || !password || password.length > 128) {
    return next(new HttpError('Invalid credentials, could not log you in.', 403));
  }

  let existingUser;
  try {
    existingUser = await User.findOne({ email });
  } catch (err) {
    console.error('ERROR FINDING USER:', err);
    return next(new HttpError(
      'Logging in failed, please try again later.',
      500
    ));
  }

  if (!existingUser) {
    return next(new HttpError(
      'Invalid credentials, could not log you in.',
      403
    ));
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    console.error('ERROR CHECKING PASSWORD:', err);
    return next(new HttpError(
      'Could not log you in, please try again later.',
      500
    ));
  }

  if (!isValidPassword) {
    return next(new HttpError(
      'Invalid credentials, could not log you in.',
      403
    ));
  }

  if (existingUser.isEmailVerified === false) {
    return next(new HttpError('Please verify your email before logging in. You can request a new verification link below.', 403));
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  } catch (err) {
    console.error('ERROR CREATING TOKEN:', err);
    return next(new HttpError(
      'Logging in failed, please try again later.',
      500
    ));
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token
  });
};

const getFavorites = async (req, res, next) => {
  let user;
  try {
    user = await User.findById(req.userData.userId).populate({
      path: 'favorites',
      populate: { path: 'creator', select: 'name image' }
    });
  } catch (err) {
    return next(new HttpError('Fetching favorites failed.', 500));
  }

  if (!user) {
    return next(new HttpError('Could not find user.', 404));
  }

  res.json({
    favorites: user.favorites.filter(Boolean).map(place =>
      place.toObject({ getters: true })
    )
  });
};

const getFavoriteStatus = async (req, res, next) => {
  let user;
  try {
    user = await User.findById(req.userData.userId).select('favorites');
  } catch (err) {
    return next(new HttpError('Checking favorite failed.', 500));
  }

  if (!user) {
    return next(new HttpError('Could not find user.', 404));
  }

  res.json({
    isFavorite: user.favorites.some(
      favoriteId => favoriteId.toString() === req.params.pid
    )
  });
};

const addFavorite = async (req, res, next) => {
  let place;
  let user;
  try {
    [place, user] = await Promise.all([
      Place.findById(req.params.pid),
      User.findById(req.userData.userId)
    ]);
  } catch (err) {
    return next(new HttpError('Adding favorite failed.', 500));
  }

  if (!place) return next(new HttpError('Could not find place.', 404));
  if (!user) return next(new HttpError('Could not find user.', 404));

  const alreadyFavorite = user.favorites.some(
    favoriteId => favoriteId.toString() === place.id
  );

  if (!alreadyFavorite) {
    user.favorites.push(place._id);
    try {
      await user.save();
    } catch (err) {
      return next(new HttpError('Adding favorite failed.', 500));
    }
  }

  res.status(200).json({ message: 'Added to favorites.', isFavorite: true });
};

const removeFavorite = async (req, res, next) => {
  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    return next(new HttpError('Removing favorite failed.', 500));
  }

  if (!user) return next(new HttpError('Could not find user.', 404));

  user.favorites.pull(req.params.pid);
  try {
    await user.save();
  } catch (err) {
    return next(new HttpError('Removing favorite failed.', 500));
  }

  res.status(200).json({ message: 'Removed from favorites.', isFavorite: false });
};

const getCollectionStatus = async (req, res, next) => {
  let user;
  try { user = await User.findById(req.userData.userId).select('wantToVisit completed'); }
  catch (err) { return next(new HttpError('Checking collections failed.', 500)); }
  if (!user) return next(new HttpError('Could not find user.', 404));
  res.json({
    wantToVisit: user.wantToVisit.some(id => id.toString() === req.params.pid),
    completed: user.completed.some(id => id.toString() === req.params.pid)
  });
};

const updateCollection = async (req, res, next) => {
  const fields = { 'want-to-visit': 'wantToVisit', completed: 'completed' };
  const field = fields[req.params.collection];
  if (!field) return next(new HttpError('Unknown collection.', 422));
  let user, place;
  try { [user, place] = await Promise.all([User.findById(req.userData.userId), Place.findById(req.params.pid)]); }
  catch (err) { return next(new HttpError('Updating collection failed.', 500)); }
  if (!user || !place) return next(new HttpError('Could not find user or place.', 404));
  const exists = user[field].some(id => id.toString() === place.id);
  if (req.method === 'PUT' && !exists) user[field].push(place._id);
  if (req.method === 'DELETE') user[field].pull(place._id);
  if (field === 'wantToVisit' && req.method === 'PUT') {
    const plannedAt = req.body.plannedAt ? new Date(req.body.plannedAt) : undefined;
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
    if ((plannedAt && Number.isNaN(plannedAt.getTime())) || note.length > 300) return next(new HttpError('Please check planned date and note.', 422));
    const plan = user.plannedVisits.find(item => item.place.toString() === place.id);
    if (plan) { plan.plannedAt = plannedAt; plan.note = note; }
    else user.plannedVisits.push({ place: place._id, plannedAt, note });
  }
  if (field === 'wantToVisit' && req.method === 'DELETE') {
    user.plannedVisits = user.plannedVisits.filter(item => item.place.toString() !== place.id);
  }
  if (field === 'completed' && req.method === 'PUT') {
    const completedAt = req.body.completedAt ? new Date(req.body.completedAt) : new Date();
    const durationMinutes = req.body.durationMinutes === '' || req.body.durationMinutes == null
      ? undefined : Number(req.body.durationMinutes);
    const distanceKm = req.body.distanceKm === '' || req.body.distanceKm == null ? undefined : Number(req.body.distanceKm);
    const elevationGain = req.body.elevationGain === '' || req.body.elevationGain == null ? undefined : Number(req.body.elevationGain);
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
    if (Number.isNaN(completedAt.getTime()) || completedAt > new Date() ||
      (durationMinutes !== undefined && (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440)) ||
      (distanceKm !== undefined && (!Number.isFinite(distanceKm) || distanceKm < 0.1 || distanceKm > 1000)) ||
      (elevationGain !== undefined && (!Number.isFinite(elevationGain) || elevationGain < 0 || elevationGain > 10000)) || note.length > 500) {
      return next(new HttpError('Please check completion date, duration and note.', 422));
    }
    user.completionLogs.push({ place: place._id, completedAt, durationMinutes, distanceKm, elevationGain, note });
  }
  if (field === 'completed' && req.method === 'DELETE') {
    user.completionLogs = user.completionLogs.filter(log => log.place.toString() !== place.id);
  }
  try { await user.save(); }
  catch (err) { return next(new HttpError('Updating collection failed.', 500)); }
  res.json({ collection: field, active: req.method === 'PUT' });
};

const updateCompletionLog = async (req, res, next) => {
  let user;
  try { user = await User.findById(req.userData.userId); }
  catch (err) { return next(new HttpError('Updating trail log failed.', 500)); }
  if (!user) return next(new HttpError('Could not find user.', 404));
  const log = user.completionLogs.id(req.params.lid);
  if (!log) return next(new HttpError('Could not find trail log entry.', 404));
  if (req.method === 'DELETE') {
    const placeId = log.place.toString();
    log.deleteOne();
    const hasOtherEntries = user.completionLogs.some(item => item.place.toString() === placeId);
    if (!hasOtherEntries) user.completed.pull(placeId);
  }
  else {
    const completedAt = new Date(req.body.completedAt);
    const durationMinutes = req.body.durationMinutes === '' || req.body.durationMinutes == null ? undefined : Number(req.body.durationMinutes);
    const distanceKm = req.body.distanceKm === '' || req.body.distanceKm == null ? undefined : Number(req.body.distanceKm);
    const elevationGain = req.body.elevationGain === '' || req.body.elevationGain == null ? undefined : Number(req.body.elevationGain);
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
    if (Number.isNaN(completedAt.getTime()) || completedAt > new Date() ||
      (durationMinutes !== undefined && (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440)) ||
      (distanceKm !== undefined && (!Number.isFinite(distanceKm) || distanceKm < 0.1 || distanceKm > 1000)) ||
      (elevationGain !== undefined && (!Number.isFinite(elevationGain) || elevationGain < 0 || elevationGain > 10000)) || note.length > 500) return next(new HttpError('Please check trail log details.', 422));
    log.completedAt = completedAt; log.durationMinutes = durationMinutes; log.distanceKm = distanceKm; log.elevationGain = elevationGain; log.note = note;
  }
  try { await user.save(); }
  catch (err) { return next(new HttpError('Updating trail log failed.', 500)); }
  res.json({ message: req.method === 'DELETE' ? 'Trail log entry deleted.' : 'Trail log entry updated.' });
};

const backfillCreatorCompletions = async (req, res, next) => {
  let user;
  let places;
  try {
    [user, places] = await Promise.all([
      User.findById(req.userData.userId),
      Place.find({ creator: req.userData.userId }).select('_id hikeDuration createdAt')
    ]);
  } catch (err) { return next(new HttpError('Updating creator trail log failed.', 500)); }
  if (!user) return next(new HttpError('Could not find user.', 404));
  let added = 0;
  places.forEach(place => {
    if (user.completionLogs.some(log => log.place.toString() === place.id)) return;
    if (!user.completed.some(id => id.toString() === place.id)) user.completed.push(place._id);
    user.completionLogs.push({ place: place._id, completedAt: place.createdAt || new Date(), durationMinutes: place.hikeDuration || undefined });
    added += 1;
  });
  try { if (added) await user.save(); }
  catch (err) { return next(new HttpError('Updating creator trail log failed.', 500)); }
  res.json({ added });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;
exports.verifyEmail = verifyEmail;
exports.resendVerificationEmail = resendVerificationEmail;
exports.getFavorites = getFavorites;
exports.getFavoriteStatus = getFavoriteStatus;
exports.addFavorite = addFavorite;
exports.removeFavorite = removeFavorite;
exports.getUserProfile = getUserProfile;
exports.updateProfile = updateProfile;
exports.deleteAccount = deleteAccount;
exports.getCollectionStatus = getCollectionStatus;
exports.updateCollection = updateCollection;
exports.updateCompletionLog = updateCompletionLog;
exports.backfillCreatorCompletions = backfillCreatorCompletions;
exports.getAccountSettings = getAccountSettings;
exports.updateAccountSettings = updateAccountSettings;
exports.changePassword = changePassword;
