const mongoose = require('mongoose');
const HttpError = require('../models/http-error');

module.exports = paramName => (req, res, next, value) => {
  if (!mongoose.isObjectIdOrHexString(value)) return next(new HttpError(`Invalid ${paramName}.`, 400));
  next();
};
