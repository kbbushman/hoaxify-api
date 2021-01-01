const express = require('express');
const userController = require('./userController');

const router = express.Router();

const validateUsername = (req) => {
  if (req.body.username === null) {
    req.validationErrors = {
      username: 'Username cannot be null',
    };
  }
};

const validateEmail = (req) => {
  if (req.body.email === null) {
    req.validationErrors = {
      ...req.validationErrors,
      email: 'Email cannot be null',
    };
  }
};

const validateRequest = (req, res, next) => {
  validateUsername(req);
  validateEmail(req);
  if (req.validationErrors) {
    const response = { validationErrors: { ...req.validationErrors } };
    return res.status(400).send(response);
  }
  next();
};

router.post('/', validateRequest, userController.create);

module.exports = router;
