const express = require('express');
const { check, validationResult } = require('express-validator');
const userController = require('./userController');
const ValidationException = require('../error/ValidationException');
const ForbiddenException = require('../error/ForbiddenException');
const pagination = require('../middleware/pagination');
const User = require('./User');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ValidationException(errors.array()));
  }
  next();
};

router.post(
  '/',
  check('username')
    .notEmpty()
    .withMessage('username_null')
    .bail()
    .isLength({ min: 4, max: 32 })
    .withMessage('username_length'),
  check('email')
    .notEmpty()
    .withMessage('email_null')
    .bail()
    .isEmail()
    .withMessage('email_invalid')
    .bail()
    .custom(async (email) => {
      const user = await userController.findByEmail(email);
      if (user) {
        throw new Error('email_inuse');
      }
    }),
  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_length')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('password_pattern'),
  validateRequest,
  userController.create
);

router.post('/token/:token', userController.activate);

router.post(
  '/password',
  check('email').isEmail().withMessage('email_invalid'),
  validateRequest,
  userController.passwordReset
);

router.put(
  '/password',
  async (req, res, next) => {
    const user = await User.findOne({
      where: { passwordResetToken: req.body.passwordResetToken },
    });
    if (!user) {
      return next(new ForbiddenException('unauthorized_password_reset'));
    }
    next();
  },
  check('password')
    .notEmpty()
    .withMessage('password_null')
    .bail()
    .isLength({ min: 6 })
    .withMessage('password_length')
    .bail()
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/)
    .withMessage('password_pattern'),
  validateRequest,
  userController.passwordUpdate
);

router.get('/', pagination, userController.getUsers);

router.get('/:id', userController.getUser);

router.put('/:id', userController.update);

router.delete('/:id', userController.deleteUser);

module.exports = router;
