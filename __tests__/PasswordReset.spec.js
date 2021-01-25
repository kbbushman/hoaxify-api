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
  const agent = request(app).post('/api/v1/users/password');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send({ email });
};

const putPasswordUpdate = (body = {}, options = {}) => {
  const agent = request(app).put('/api/v1/users/password');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(body);
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
      expect(response.body.path).toBe('/api/v1/users/password');
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

  it.each`
    language | message
    ${'es'}  | ${es.email_failure}
    ${'en'}  | ${en.email_failure}
  `(
    'returns $message when language is set to $language after email failure',
    async ({ language, message }) => {
      simulateSmtpFailure = true;
      const user = await addUser();
      const response = await postPasswordReset(user.email, { language });
      expect(response.body.message).toBe(message);
    }
  );
});

describe('Password Update', () => {
  it('returns 403 when password update request does not have a valid password reset token', async () => {
    const response = await putPasswordUpdate({
      password: 'P4ssword',
      passwordResetToken: 'abcd',
    });
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'es'}  | ${es.unauthorized_password_reset}
    ${'en'}  | ${en.unauthorized_password_reset}
  `(
    'returns error body with $message when language is set to $language when password reset token is invalid',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await putPasswordUpdate(
        {
          password: 'P4ssword',
          passwordResetToken: 'abcd',
        },
        { language }
      );
      expect(response.body.path).toBe('/api/v1/users/password');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 403 when passowrd update request with invalid password pattern and reset token is invalid', async () => {
    const response = await putPasswordUpdate({
      password: 'not-valid',
      passwordResetToken: 'abcd',
    });
    expect(response.status).toBe(403);
  });

  it('returns 400 when trying to update with invalid password and the reset token is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    const response = await putPasswordUpdate({
      password: 'not-valid',
      passwordResetToken: 'test-token',
    });
    expect(response.status).toBe(400);
  });

  it.each`
    language | value              | message
    ${'en'}  | ${null}            | ${en.password_null}
    ${'en'}  | ${'passw'}         | ${en.password_length}
    ${'en'}  | ${'alllowercase'}  | ${en.password_pattern}
    ${'en'}  | ${'ALLUPPERCASE'}  | ${en.password_pattern}
    ${'en'}  | ${'123456789'}     | ${en.password_pattern}
    ${'en'}  | ${'lowerandUPPER'} | ${en.password_pattern}
    ${'en'}  | ${'lowerand1234'}  | ${en.password_pattern}
    ${'en'}  | ${'UPPERAND1234'}  | ${en.password_pattern}
    ${'es'}  | ${null}            | ${es.password_null}
    ${'es'}  | ${'passw'}         | ${es.password_length}
    ${'es'}  | ${'alllowercase'}  | ${es.password_pattern}
    ${'es'}  | ${'ALLUPPERCASE'}  | ${es.password_pattern}
    ${'es'}  | ${'123456789'}     | ${es.password_pattern}
    ${'es'}  | ${'lowerandUPPER'} | ${es.password_pattern}
    ${'es'}  | ${'lowerand1234'}  | ${es.password_pattern}
    ${'es'}  | ${'UPPERAND1234'}  | ${es.password_pattern}
  `(
    'returns password validation error "$message" when language is set to $language and the value is $value',
    async ({ language, message, value }) => {
      const user = await addUser();
      user.passwordResetToken = 'test-token';
      await user.save();
      const response = await putPasswordUpdate(
        {
          password: value,
          passwordResetToken: 'test-token',
        },
        { language }
      );
      expect(response.body.validationErrors.password).toBe(message);
    }
  );
});
