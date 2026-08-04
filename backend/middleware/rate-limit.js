const HttpError = require('../models/http-error');

const buckets = new Map();

module.exports = ({ windowMs, max, message = 'Too many requests. Please try again later.' }) => (req, res, next) => {
  const now = Date.now();
  const key = `${req.ip}:${req.baseUrl}:${req.route ? req.route.path : req.path}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return next();
  }
  bucket.count += 1;
  if (bucket.count > max) {
    res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
    return next(new HttpError(message, 429));
  }
  if (buckets.size > 10000) {
    for (const [bucketKey, value] of buckets) if (value.resetAt <= now) buckets.delete(bucketKey);
  }
  next();
};
