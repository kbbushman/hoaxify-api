const bcrypt = require('bcrypt');
const User = require('../user/User');
const AuthenticationException = require('./AuthenticationException');
const ForbiddenException = require('./ForbiddenException');

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

    return res.send({ id: user.id, username: user.username });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
};
