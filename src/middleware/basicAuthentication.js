const bcrypt = require('bcrypt');
const User = require('../user/User');

const basicAuthentication = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (authorization) {
    const encoded = authorization.substring(6);
    const decoded = Buffer.from(encoded, 'base64').toString('ascii');
    const [email, password] = decoded.split(':');

    try {
      const user = await User.findOne({ where: { email } });

      if (user && !user.inactive) {
        const match = await bcrypt.compare(password, user.password);
        if (match) {
          req.authenticatedUser = user;
        }
      }
    } catch (err) {
      next(err);
    }
  }
  next();
};

module.exports = basicAuthentication;
