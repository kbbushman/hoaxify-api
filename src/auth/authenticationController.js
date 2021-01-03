const User = require('../user/User');

const login = async (req, res, next) => {
  try {
    const user = await User.findOne({
      where: { email: req.body.email },
      attributes: ['id', 'username'],
    });
    if (!user) {
      // const error = new Error('User does not exist');
      // error.status = 401;
      // throw error;
      return res.sendStatus(401);
    }
    return res.send(user);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
};
