const express = require('express');
const reportsControllers = require('../controllers/reports-controllers');
const checkAuth = require('../middleware/check-auth');
const checkAdmin = require('../middleware/check-admin');
const rateLimit = require('../middleware/rate-limit');
const validateObjectId = require('../middleware/validate-object-id');
const router = express.Router();
router.param('rid', validateObjectId('report id'));

router.use(checkAuth);
router.post('/', rateLimit({ windowMs: 60 * 60 * 1000, max: 30, message: 'Too many reports were submitted. Please try again later.' }), reportsControllers.createReport);
router.get('/', checkAdmin, reportsControllers.getReports);
router.patch('/:rid', checkAdmin, reportsControllers.reviewReport);
router.delete('/:rid/content', checkAdmin, reportsControllers.removeReportedContent);
module.exports = router;
