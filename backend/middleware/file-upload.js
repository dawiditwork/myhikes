const multer = require('multer');

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif'
];

const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const isValid = ALLOWED_MIME_TYPES.includes(file.mimetype);

    if (!isValid) {
      return cb(new Error('Invalid image type.'));
    }

    cb(null, true);
  }
});

module.exports = fileUpload;
