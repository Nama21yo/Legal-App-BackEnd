const express = require('express');
const router = express.Router();
const { getNotificationController } = require('../notifications/notificationController');


router.get('/:userId', getNotificationController)

module.exports = router;