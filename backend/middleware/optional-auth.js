const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next();
  try {
    const decodedToken = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.userData = { userId: decodedToken.userId };
  } catch (err) {}
  next();
};
