const { verify } = require('../auth/tokenService');

const tokenAuthentication = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (authorization) {
    const token = authorization.substring(7);
    try {
      const user = await verify(token);
      req.authenticatedUser = user;
    } catch (err) {
      next(err);
    }
  }
  next();
};

module.exports = tokenAuthentication;
