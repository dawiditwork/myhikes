const express = require('express');
const checkAuth = require('../middleware/check-auth');
const notificationsControllers = require('../controllers/notifications-controllers');
const validateObjectId = require('../middleware/validate-object-id');

const router = express.Router();
router.param('nid', validateObjectId('notification id'));
router.use(checkAuth);
router.get('/', notificationsControllers.getNotifications);
router.patch('/read-all', notificationsControllers.markAllRead);
router.patch('/:nid/read', notificationsControllers.markNotificationRead);

module.exports = router;
