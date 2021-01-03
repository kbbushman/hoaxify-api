const User = require('../user/User');
const AuthenticationException = require('./AuthenticationException');

const login = async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { email: req.body.email },
      attributes: ['id', 'username'],
    });
    if (!user) {
      throw new AuthenticationException();
    }
    return res.send(user);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
};
