const User = require('../models/user');
const HttpError = require('../models/http-error');

module.exports = async (req, res, next) => {
  let user;
  try { user = await User.findById(req.userData.userId).select('role email'); }
  catch (err) { return next(new HttpError('Checking administrator access failed.', 500)); }
  const configuredAdmins = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  if (!user || (user.role !== 'admin' && !configuredAdmins.includes(user.email.toLowerCase()))) return next(new HttpError('Administrator access required.', 403));
  next();
};
