module.exports = function EmailException() {
  this.message = 'authentication_failure';
  this.status = 401;
};
