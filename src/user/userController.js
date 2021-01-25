const bcrypt = require('bcrypt');
const Sequelize = require('sequelize');
const User = require('./User');
const emailService = require('../email/emailService');
const sequelize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('./InvalidTokenException');
const ForbiddenException = require('../error/ForbiddenException');
const NotFoundException = require('../error/NotFoundException');
const fileService = require('../file/fileService');
const { clearTokens } = require('../auth/tokenService');
const { randomString } = require('../shared/generator');

const create = async (req, res, next) => {
  const { username, email, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const user = {
    username,
    email,
    password: hash,
    activationToken: randomString(16),
  };

  const transaction = await sequelize.transaction();
  await User.create(user, { transaction });

  try {
    await emailService.sendAccountActivation(email, user.activationToken);
    await transaction.commit();
    return res.send({ message: req.t('user_create_success') });
  } catch (err) {
    transaction.rollback();
    next(new EmailException());
  }
};

const activate = async (req, res, next) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({ where: { activationToken: token } });

    if (!user) {
      throw new InvalidTokenException();
    }

    user.inactive = false;
    user.activationToken = null;
    await user.save();
    return res.send({ message: req.t('account_activation_success') });
  } catch (err) {
    next(err);
  }
};

const getUsers = async (req, res) => {
  const { authenticatedUser } = req;
  const { size, page } = req.pagination;

  const usersWithCount = await User.findAndCountAll({
    where: {
      inactive: false,
      id: {
        [Sequelize.Op.not]: authenticatedUser ? authenticatedUser.id : 0,
      },
    },
    attributes: ['id', 'username', 'email', 'image'],
    limit: size,
    offset: page * size,
  });

  return res.send({
    content: usersWithCount.rows,
    page: page,
    size: size,
    totalPages: Math.ceil(usersWithCount.count / size),
  });
};

const getUser = async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { id: req.params.id, inactive: false },
      attributes: ['id', 'username', 'email', 'image'],
    });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }
    return res.status(200).send(user);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  const authenticatedUser = req.authenticatedUser;
  if (!authenticatedUser || authenticatedUser.id.toString() !== req.params.id) {
    return next(new ForbiddenException('unauthorized_user_update'));
  }

  try {
    const user = await User.findOne({ where: { id: req.params.id } });
    user.username = req.body.username;
    req.body.image
      ? (user.image = await fileService.saveProfileImage(req.body.image))
      : null;
    await user.save();
    return res.send({
      id: user.id,
      username: user.username,
      email: user.email,
      image: user.image,
    });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  const authenticatedUser = req.authenticatedUser;
  if (!authenticatedUser || authenticatedUser.id.toString() !== req.params.id) {
    return next(new ForbiddenException('unauthorized_user_delete'));
  }

  try {
    await User.destroy({ where: { id: authenticatedUser.id } });
    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
};

const passwordReset = async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) {
      return next(new NotFoundException('email_not_in_use'));
    }
    user.passwordResetToken = randomString(16);
    await user.save();
    await emailService.sendPasswordReset(user.email, user.passwordResetToken);
    res.send({ message: req.t('password_reset_request_success') });
  } catch (err) {
    next(new EmailException());
  }
};

const passwordUpdate = async (req, res, next) => {
  const { passwordResetToken, password } = req.body;
  try {
    const user = await findByPasswordResetToken(passwordResetToken);
    const hash = await bcrypt.hash(password, 10);
    user.password = hash;
    user.passwordResetToken = null;
    user.inactive = false;
    user.activationToken = null;
    await user.save();
    await clearTokens(user.id);
    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email } });
};

const findByPasswordResetToken = (token) => {
  return User.findOne({ where: { passwordResetToken: token } });
};

module.exports = {
  create,
  activate,
  findByEmail,
  getUsers,
  getUser,
  update,
  deleteUser,
  passwordReset,
  passwordUpdate,
  findByPasswordResetToken,
};
