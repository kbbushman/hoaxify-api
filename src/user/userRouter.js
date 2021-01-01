const express = require('express');
const { check, validationResult } = require('express-validator');
const userController = require('./userController');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors = {};
    errors
      .array()
      .forEach((error) => (validationErrors[error.param] = error.msg));
    return res.status(400).send({ validationErrors });
  }
  next();
};

router.post(
  '/',
  check('username')
    .notEmpty()
    .withMessage('Username cannot be null')
    .bail()
    .isLength({ min: 4 })
    .withMessage('Must have min 4 and max 32 characters'),
  check('email').notEmpty().withMessage('Email cannot be null'),
  check('password').notEmpty().withMessage('Password cannot be null'),
  validateRequest,
  userController.create
);

module.exports = router;
