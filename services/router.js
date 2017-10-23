const express = require('express');
const router = express.Router();
const requireAuth = require('./auth');
const loadVirgilCard = require('./loadVirgilCard');
const userController = require('../controllers/users');
const tokenController = require('../controllers/tokens');

router.route('/users').post(userController.register);
router.route('/tokens/twilio')
	.get(requireAuth(), loadVirgilCard(), tokenController.getTwilioToken);

module.exports = router;