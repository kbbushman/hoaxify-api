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

router.post('/', validateUsername, userController.create);

module.exports = router;
