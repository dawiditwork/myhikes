const HttpError = require('../models/http-error');
const Notification = require('../models/notification');

const getNotifications = async (req, res, next) => {
  let notifications;
  let unreadCount;
  try {
    [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.userData.userId })
        .populate('actor', 'name image')
        .populate('place', 'title')
        .sort({ createdAt: -1 })
        .limit(30),
      Notification.countDocuments({ recipient: req.userData.userId, read: false })
    ]);
  } catch (err) {
    return next(new HttpError('Fetching notifications failed.', 500));
  }
  res.json({ notifications: notifications.map(item => item.toObject({ getters: true })), unreadCount });
};

const markNotificationRead = async (req, res, next) => {
  let notification;
  try {
    notification = await Notification.findOneAndUpdate(
      { _id: req.params.nid, recipient: req.userData.userId },
      { read: true },
      { new: true }
    );
  } catch (err) {
    return next(new HttpError('Updating notification failed.', 500));
  }
  if (!notification) return next(new HttpError('Could not find notification.', 404));
  res.json({ message: 'Notification marked as read.' });
};

const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.userData.userId, read: false }, { read: true });
  } catch (err) {
    return next(new HttpError('Updating notifications failed.', 500));
  }
  res.json({ message: 'All notifications marked as read.' });
};

exports.getNotifications = getNotifications;
exports.markNotificationRead = markNotificationRead;
exports.markAllRead = markAllRead;
