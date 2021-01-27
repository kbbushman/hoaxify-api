const path = require('path');
const express = require('express');
const i18next = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const config = require('config');
const userRouter = require('./user/userRouter');
const authenticationRouter = require('./auth/authenticationRouter');
const errorHandler = require('./error/errorHandler');
const tokenAuthentication = require('./middleware/tokenAuthentication');
const fileService = require('./file/fileService');

const { uploadDir, profileDir } = config;
const profileFolder = path.join('.', uploadDir, profileDir);

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

fileService.createFolders();

const app = express();

app.use(middleware.handle(i18next));
app.use(express.json());

app.use('/images', express.static(profileFolder));

app.use(tokenAuthentication);

app.use('/api/v1/users', userRouter);
app.use('/api/v1/auth', authenticationRouter);

app.use(errorHandler);

module.exports = app;
