const express = require('express');
const router = express.Router();

const signupController = require('./signup.controller');
const loginController = require('./login.controller');

router.post('/signup', signupController);
router.post('/login', loginController);

module.exports = router;
