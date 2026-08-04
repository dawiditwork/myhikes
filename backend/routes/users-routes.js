const express = require('express');
const { check } = require('express-validator');

const usersController = require('../controllers/users-controllers');
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');
const optionalAuth = require('../middleware/optional-auth');
const rateLimit = require('../middleware/rate-limit');
const validateObjectId = require('../middleware/validate-object-id');

const router = express.Router();
router.param('uid', validateObjectId('user id'));
router.param('pid', validateObjectId('place id'));
router.param('lid', validateObjectId('trail log id'));

const signupLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many accounts were created. Please try again later.' });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many login attempts. Please try again in 15 minutes.' });
const verificationLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many verification emails requested. Please try again later.' });

router.get('/', usersController.getUsers);
router.get('/:uid/profile', optionalAuth, usersController.getUserProfile);

router.post(
  '/signup',
  signupLimit,
  fileUpload.single('image'),
  [
    check('name')
      .not()
      .isEmpty(),
    check('email')
      .normalizeEmail()
      .isEmail(),
    check('password').isLength({ min: 8, max: 128 })
  ],
  usersController.signup
);

router.post('/login', loginLimit, usersController.login);
router.get('/verify-email', usersController.verifyEmail);
router.post(
  '/resend-verification',
  verificationLimit,
  [check('email').normalizeEmail().isEmail()],
  usersController.resendVerificationEmail
);

router.use(checkAuth);

router.get('/favorites', usersController.getFavorites);
router.get('/favorites/:pid', usersController.getFavoriteStatus);
router.post('/favorites/:pid', usersController.addFavorite);
router.delete('/favorites/:pid', usersController.removeFavorite);
router.get('/collections/:pid', usersController.getCollectionStatus);
router.put('/collections/:collection/:pid', usersController.updateCollection);
router.delete('/collections/:collection/:pid', usersController.updateCollection);
router.patch('/completion-logs/:lid', usersController.updateCompletionLog);
router.delete('/completion-logs/:lid', usersController.updateCompletionLog);
router.post('/completion-logs/backfill-created', usersController.backfillCreatorCompletions);
router.patch(
  '/profile',
  fileUpload.single('image'),
  usersController.updateProfile
);
router.delete('/profile', usersController.deleteAccount);
router.get('/account/settings', usersController.getAccountSettings);
router.patch('/account/settings', usersController.updateAccountSettings);
router.patch('/account/password', usersController.changePassword);

module.exports = router;
