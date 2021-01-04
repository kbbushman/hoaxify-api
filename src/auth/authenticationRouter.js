const express = require('express');
const { check, validationResult } = require('express-validator');
const authenticationController = require('./authenticationController');
const AuthenticationException = require('./AuthenticationException');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AuthenticationException());
  }
  next();
};

const router = express.Router();

router.post(
  '/',
  check('email').isEmail(),
  validateRequest,
  authenticationController.login
);

module.exports = router;
