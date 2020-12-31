const express = require('express');
const userController = require('./userController');

const router = express.Router();

const validateUsername = (req, res, next) => {
  if (req.body.username === null) {
    return res
      .status(400)
      .json({ validationErrors: { username: 'Username cannot be null' } });
  }
  next();
};

const validateEmail = (req, res, next) => {
  if (req.body.email === null) {
    return res
      .status(400)
      .json({ validationErrors: { email: 'Email cannot be null' } });
  }
  next();
};

router.post('/', validateUsername, validateEmail, userController.create);

module.exports = router;
