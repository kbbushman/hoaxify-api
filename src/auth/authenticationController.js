const User = require('../user/User');

const login = async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { email: req.body.email },
      attributes: ['id', 'username'],
    });
    return res.send(user);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
};
