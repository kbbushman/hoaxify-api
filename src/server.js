const express = require('express');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const userRouter = require('./user/userRouter');

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    backend: {
      loadPath: './locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      lookupHeader: 'accept-language',
    },
  });

const app = express();

app.use(middleware.handle(i18next));

app.use(express.json());

app.use('/api/v1/users', userRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const { status, message, errors } = err;
  let validationErrors;
  // Errors from express-validator
  if (errors) {
    validationErrors = {};
    errors.forEach(
      (error) => (validationErrors[error.param] = req.t(error.msg))
    );
  }
  res.status(status).send({ message: req.t(message), validationErrors });
});

module.exports = app;
