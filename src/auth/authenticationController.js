const bcrypt = require('bcrypt');
const User = require('../user/User');
const AuthenticationException = require('./AuthenticationException');
const ForbiddenException = require('../error/ForbiddenException');
const tokenService = require('./tokenService');

const login = async (req, res, next) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({
      where: { email },
    });
    if (!user) {
      throw new AuthenticationException();
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new AuthenticationException();
    }

    if (user.inactive) {
      throw new ForbiddenException();
    }

    const token = await tokenService.createToken(user);

    return res.send({
      id: user.id,
      username: user.username,
      image: user.image,
      token,
    });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res) => {
  const authorization = req.headers.authorization;

  if (authorization) {
    const token = authorization.substring(7);
    await tokenService.deleteToken(token);
  }
  res.send();
};

module.exports = {
  login,
  logout,
};
