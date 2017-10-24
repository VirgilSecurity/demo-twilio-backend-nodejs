const express = require('express');
const router = express.Router();
const requireAuth = require('./auth');
const loadVirgilCard = require('./loadVirgilCard');
const userController = require('../controllers/users');
const tokenController = require('../controllers/tokens');
const healthController = require('../controllers/health');

router.route('/users').post(userController.register);
router.route('/tokens/twilio').get(
	requireAuth(),
	loadVirgilCard(),
	tokenController.getTwilioToken
);
router.route('/health/status').get(healthController.status);


module.exports = router;