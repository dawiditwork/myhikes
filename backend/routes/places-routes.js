const express = require('express');
const { check } = require('express-validator');

const placesControllers = require('../controllers/places-controllers');
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');
const rateLimit = require('../middleware/rate-limit');
const validateObjectId = require('../middleware/validate-object-id');

const router = express.Router();
router.param('pid', validateObjectId('place id'));
router.param('uid', validateObjectId('user id'));
router.param('cid', validateObjectId('comment id'));
router.param('rid', validateObjectId('condition report id'));

const interactionLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 80 });
const publishingLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: 'Too many places were submitted. Please try again later.' });

router.get('/', placesControllers.getAllPlaces);

router.get('/:pid', placesControllers.getPlaceById);

router.get('/user/:uid', placesControllers.getPlacesByUserId);

router.use(checkAuth);

router.post(
  '/',
  publishingLimit,
  fileUpload.array('images', 5), // ⬅️ WIELE ZDJĘĆ
  [
    check('title').trim().isLength({ min: 1, max: 120 }),
    check('description').trim().isLength({ min: 5, max: 5000 }),
    check('address').trim().isLength({ min: 1, max: 300 }),
    check('parkingAddress').trim().isLength({ min: 1, max: 300 }),
    check('hikeDuration').isInt({ min: 1, max: 1440 }),
    check('distanceKm').isFloat({ min: 0.1, max: 1000 }),
    check('elevationGain').isInt({ min: 0, max: 10000 }),
    check('difficulty').isIn(['easy', 'moderate', 'hard', 'expert']),
    check('trailStatus').isIn(['open', 'caution', 'closed', 'seasonal'])
    ,check('requiredEquipment').custom(value => {
      const parsed = Array.isArray(value) ? value : JSON.parse(value || '[]');
      return parsed.every(item => ['hiking_boots', 'poles', 'microspikes', 'helmet'].includes(item));
    })
  ],
  placesControllers.createPlace
);

router.patch(
  '/:pid',
  [
    check('title').trim().isLength({ min: 1, max: 120 }),
    check('description').trim().isLength({ min: 5, max: 5000 }),
    check('parkingAddress').trim().isLength({ min: 1, max: 300 }),
    check('hikeDuration').isInt({ min: 1, max: 1440 }),
    check('distanceKm').isFloat({ min: 0.1, max: 1000 }),
    check('elevationGain').isInt({ min: 0, max: 10000 }),
    check('difficulty').isIn(['easy', 'moderate', 'hard', 'expert']),
    check('trailStatus').isIn(['open', 'caution', 'closed', 'seasonal'])
    ,check('requiredEquipment').isArray({ max: 4 }).custom(value =>
      value.every(item => ['hiking_boots', 'poles', 'microspikes', 'helmet'].includes(item))
    )
  ],
  placesControllers.updatePlace
);

router.delete('/:pid', placesControllers.deletePlace);
router.post('/:pid/comments', interactionLimit, placesControllers.addComment);
router.delete('/:pid/comments/:cid', placesControllers.deleteComment);
router.put('/:pid/rating', interactionLimit, placesControllers.ratePlace);
router.post('/:pid/conditions', interactionLimit, placesControllers.addConditionReport);
router.delete('/:pid/conditions/:rid', placesControllers.deleteConditionReport);
router.put('/:pid/conditions/:rid/confirm', placesControllers.confirmConditionReport);

module.exports = router;
