const request = require('supertest');
const bcrypt = require('bcrypt');
const SMTPServer = require('smtp-server').SMTPServer;
const config = require('config');
const app = require('../src/server');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const en = require('../locales/en/translation.json');
const es = require('../locales/es/translation.json');

let lastMail, server;
let simulateSmtpFailure = false;

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const err = new Error('Invalid mailbox');
          err.responseCode = 553;
          return callback(err);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });

  await server.listen(config.mail.port, 'localhost');
  await sequelize.sync();
  jest.setTimeout(20000);
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  await User.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(5000);
});

const activeUser = {
  username: 'test1',
  email: 'test@test.com',
  password: 'P4ssword',
  inactive: false,
};

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const postPasswordReset = (email = 'test@test.com', options = {}) => {
  const agent = request(app).post('/api/v1/users/password-reset');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send({ email });
};

describe('Password Reset Request', () => {
  it('returns 404 when a password reset request is sent for unknown email', async () => {
    const response = await postPasswordReset();
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'es'}  | ${es.email_not_in_use}
    ${'en'}  | ${en.email_not_in_use}
  `(
    'returns error body with $message for unknown email password reset request when language is set to $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await postPasswordReset('test@test.com', { language });
      expect(response.body.path).toBe('/api/v1/users/password-reset');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it.each`
    language | message
    ${'es'}  | ${es.email_invalid}
    ${'en'}  | ${en.email_invalid}
  `(
    'returns 400 with validation error $message when request does not have a valid email and language is set to $language',
    async ({ language, message }) => {
      const response = await postPasswordReset(null, { language });
      expect(response.body.validationErrors.email).toBe(message);
      expect(response.status).toBe(400);
    }
  );

  it('returns 200 ok when a password reset request is sent for known email', async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(200);
  });

  it.each`
    language | message
    ${'es'}  | ${es.password_reset_request_success}
    ${'en'}  | ${en.password_reset_request_success}
  `(
    'returns success response body with $message for known email password reset request when language is set to $language',
    async ({ language, message }) => {
      const user = await addUser();
      const response = await postPasswordReset(user.email, { language });
      expect(response.body.message).toBe(message);
    }
  );

  it('creates passwordResetToken when a password reset request is sent for a know email', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({ where: { email: user.email } });
    expect(userInDB.passwordResetToken).toBeTruthy();
  });

  it('sends a password reset email with passwordResetToken', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({ where: { email: user.email } });
    const passwordResetToken = userInDB.passwordResetToken;
    expect(lastMail).toContain('test@test.com');
    expect(lastMail).toContain(passwordResetToken);
  });

  it('returns 502 Bad Gateway when sending email fails', async () => {
    simulateSmtpFailure = true;
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(502);
  });
});
