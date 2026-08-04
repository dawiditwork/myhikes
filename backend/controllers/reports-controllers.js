const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const HttpError = require('../models/http-error');
const Place = require('../models/place');
const Report = require('../models/report');
const User = require('../models/user');
const Notification = require('../models/notification');

const createNotification = data => Notification.create(data).catch(err => {
  console.error('Failed to create moderation notification:', err);
  return null;
});

const createReport = async (req, res, next) => {
  const { targetType, placeId, targetId, targetLabel, reason } = req.body;
  const details = typeof req.body.details === 'string' ? req.body.details.trim() : '';
  if (!['place', 'comment', 'condition'].includes(targetType) || !['incorrect', 'unsafe', 'spam', 'abuse', 'other'].includes(reason) || details.length > 500) return next(new HttpError('Please check the report details.', 422));
  let place;
  try { place = await Place.findById(placeId); }
  catch (err) { return next(new HttpError('Creating report failed.', 500)); }
  if (!place) return next(new HttpError('Could not find place.', 404));
  const normalizedTargetId = targetType === 'place' ? place.id : String(targetId || '');
  if (targetType === 'comment' && !place.comments.id(normalizedTargetId)) return next(new HttpError('Could not find comment.', 404));
  if (targetType === 'condition' && !place.conditionReports.id(normalizedTargetId)) return next(new HttpError('Could not find condition report.', 404));
  let duplicate;
  try { duplicate = await Report.findOne({ reporter: req.userData.userId, targetType, targetId: normalizedTargetId, status: 'open' }); }
  catch (err) { return next(new HttpError('Creating report failed.', 500)); }
  if (duplicate) return next(new HttpError('You already reported this content.', 409));
  try { await new Report({ targetType, place: place._id, targetId: normalizedTargetId, targetLabel, reason, details, reporter: req.userData.userId }).save(); }
  catch (err) { return next(new HttpError('Creating report failed.', 500)); }
  try {
    const configuredAdmins = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
    const admins = await User.find({
      $or: [{ role: 'admin' }, ...(configuredAdmins.length ? [{ email: { $in: configuredAdmins } }] : [])]
    }).select('_id');
    const adminNotifications = admins
      .filter(admin => admin.id !== req.userData.userId)
      .map(admin => ({
          recipient: admin._id,
          actor: req.userData.userId,
          type: 'moderation_report',
          message: `reported a ${targetType} for moderation.`,
          place: place._id
        }));
    if (adminNotifications.length) await Notification.insertMany(adminNotifications);
  } catch (err) { console.error('Failed to notify administrators:', err); }
  res.status(201).json({ message: 'Report submitted for review.' });
};

const getReports = async (req, res, next) => {
  const status = ['open', 'resolved', 'dismissed'].includes(req.query.status) ? req.query.status : 'open';
  let reports;
  try { reports = await Report.find({ status }).populate('reporter', 'name image').populate('place', 'title').sort({ createdAt: -1 }); }
  catch (err) { return next(new HttpError('Fetching reports failed.', 500)); }
  res.json({ reports: reports.filter(report => report.place).map(report => report.toObject({ getters: true })) });
};

const reviewReport = async (req, res, next) => {
  if (!['resolved', 'dismissed'].includes(req.body.status)) return next(new HttpError('Please choose a valid review result.', 422));
  let report;
  try { report = await Report.findById(req.params.rid); }
  catch (err) { return next(new HttpError('Reviewing report failed.', 500)); }
  if (!report) return next(new HttpError('Could not find report.', 404));
  report.status = req.body.status; report.reviewedBy = req.userData.userId; report.reviewedAt = new Date();
  try {
    await report.save();
    await createNotification({
      recipient: report.reporter,
      actor: req.userData.userId,
      type: report.status === 'resolved' ? 'moderation_resolved' : 'moderation_dismissed',
      message: `Your ${report.targetType} report was ${report.status}.`,
      place: report.place
    });
  }
  catch (err) { return next(new HttpError('Reviewing report failed.', 500)); }
  res.json({ message: `Report marked as ${report.status}.` });
};

const removeReportedContent = async (req, res, next) => {
  let report;
  let place;
  try {
    report = await Report.findById(req.params.rid);
    if (report) place = await Place.findById(report.place);
  } catch (err) {
    return next(new HttpError('Removing reported content failed.', 500));
  }
  if (!report) return next(new HttpError('Could not find report.', 404));
  if (!place) return next(new HttpError('The reported place no longer exists.', 404));

  if (report.targetType === 'place') {
    const placeOwner = place.creator;
    const imagePaths = [...new Set([...(place.images || []), place.image].filter(Boolean))];
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await Place.deleteOne({ _id: place._id }, { session });
      await User.updateMany(
        {},
        { $pull: {
          places: place._id,
          favorites: place._id,
          wantToVisit: place._id,
          plannedVisits: { place: place._id },
          completed: place._id,
          completionLogs: { place: place._id }
        } },
        { session }
      );
      await Report.deleteMany({ place: place._id }, { session });
      await Notification.deleteMany({ place: place._id }, { session });
      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      return next(new HttpError('Removing reported place failed.', 500));
    } finally {
      await session.endSession();
    }
    imagePaths.forEach(imagePath => {
      fs.unlink(path.join(__dirname, '..', imagePath), err => {
        if (err && err.code !== 'ENOENT') console.error('Failed to delete moderated place image:', err);
      });
    });
    try {
      await createNotification({ recipient: report.reporter, actor: req.userData.userId, type: 'moderation_removed', message: 'A place you reported was removed.' });
      if (placeOwner.toString() !== report.reporter.toString()) {
        await createNotification({ recipient: placeOwner, actor: req.userData.userId, type: 'moderation_removed', message: 'Your place was removed by moderation.' });
      }
    } catch (err) { console.error('Failed to create moderation notification:', err); }
    return res.json({ message: 'Reported place removed.' });
  }

  const collection = report.targetType === 'comment' ? place.comments : place.conditionReports;
  const content = collection.id(report.targetId);
  if (!content) return next(new HttpError('The reported content no longer exists.', 404));
  content.deleteOne();

  try {
    const contentAuthor = content.author;
    await place.save();
    await Report.updateMany(
      { targetType: report.targetType, targetId: report.targetId, status: 'open' },
      { status: 'resolved', reviewedBy: req.userData.userId, reviewedAt: new Date() }
    );
    await createNotification({ recipient: report.reporter, actor: req.userData.userId, type: 'moderation_removed', message: `The ${report.targetType} you reported was removed.`, place: place._id });
    if (contentAuthor.toString() !== report.reporter.toString()) {
      await createNotification({ recipient: contentAuthor, actor: req.userData.userId, type: 'moderation_removed', message: `Your ${report.targetType} was removed by moderation.`, place: place._id });
    }
  } catch (err) {
    return next(new HttpError('Removing reported content failed.', 500));
  }
  res.json({ message: 'Reported content removed.' });
};

exports.createReport = createReport;
exports.getReports = getReports;
exports.reviewReport = reviewReport;
exports.removeReportedContent = removeReportedContent;
