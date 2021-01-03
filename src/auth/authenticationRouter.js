const express = require('express');
// const { check, validationResult } = require('express-validator');
const authenticationController = require('./authenticationController');

const router = express.Router();

router.post('/', authenticationController.login);

module.exports = router;
