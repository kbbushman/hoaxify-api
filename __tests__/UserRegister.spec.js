const request = require('supertest');
const SMTPServer = require('smtp-server').SMTPServer;
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

  await server.listen(8587, 'localhost');
  await sequelize.sync();
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  await User.destroy({ truncate: true });
});

afterAll(async () => {
  await server.close();
});

const validUser = {
  username: 'test1',
  email: 'test@test.com',
  password: 'P4ssword',
};

const createUser = (user = validUser, options = {}) => {
  const agent = request(app).post('/api/v1/users');

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  return agent.send(user);
};

describe('User Registration', () => {
  it('returns 200 on successful signup request', async () => {
    const response = await createUser();
    expect(response.status).toBe(200);
  });

  it('returns a success message on successful signup request', async () => {
    const response = await createUser();
    expect(response.body.message).toBe(en.user_create_success);
  });

  it('saves the user to the database', async () => {
    await createUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it('saves the username and email to the database', async () => {
    await createUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe('test1');
    expect(savedUser.email).toBe('test@test.com');
  });

  it('saves password hash to the database', async () => {
    await createUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe('P4ssword');
  });

  it('returns 400 if username is null', async () => {
    const response = await createUser({
      username: null,
      email: 'test@test.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(400);
  });

  it('returns validationErrors field in response body when validation errors occur', async () => {
    const response = await createUser({
      username: null,
      email: 'test@test.com',
      password: 'P4ssword',
    });
    expect(response.body.validationErrors).not.toBeUndefined();
  });

  it('returns errors for username and email when both are null', async () => {
    const response = await createUser({
      username: null,
      email: null,
      password: 'P4ssword',
    });
    expect(Object.keys(response.body.validationErrors)).toEqual([
      'username',
      'email',
    ]);
  });

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${en.username_null}
    ${'username'} | ${'usr'}           | ${en.username_length}
    ${'username'} | ${'a'.repeat(33)}  | ${en.username_length}
    ${'email'}    | ${null}            | ${en.email_null}
    ${'email'}    | ${'mail.com'}      | ${en.email_invalid}
    ${'email'}    | ${'test.mail.com'} | ${en.email_invalid}
    ${'email'}    | ${'test@mail'}     | ${en.email_invalid}
    ${'password'} | ${null}            | ${en.password_null}
    ${'password'} | ${'passw'}         | ${en.password_length}
    ${'password'} | ${'alllowercase'}  | ${en.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${en.password_pattern}
    ${'password'} | ${'123456789'}     | ${en.password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${en.password_pattern}
    ${'password'} | ${'lowerand1234'}  | ${en.password_pattern}
    ${'password'} | ${'UPPERAND1234'}  | ${en.password_pattern}
  `(
    'returns "$expectedMessage" when $field is $value',
    async ({ field, expectedMessage, value }) => {
      const user = {
        username: 'test1',
        email: 'test@test.com',
        password: 'P4ssword',
      };
      user[field] = value;
      const response = await createUser(user);
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns "${en.email_invalid}" when email is already in use`, async () => {
    await User.create({ ...validUser });
    const response = await createUser();
    expect(response.body.validationErrors.email).toBe(en.email_inuse);
  });

  it('returns errors for both username is null and email already in use', async () => {
    await User.create({ ...validUser });
    const response = await createUser({
      username: null,
      email: validUser.email,
      password: 'P4ssword',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it('creates user in inactive mode', async () => {
    await createUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates user in inactive mode even if the request body contains inactive as false', async () => {
    const newUser = { ...validUser, inactive: false };
    await createUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates an activation token for the user', async () => {
    const newUser = { ...validUser, inactive: false };
    await createUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  it('sends an account activation email with activationToken', async () => {
    await createUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(lastMail).toContain('test@test.com');
    expect(lastMail).toContain(savedUser.activationToken);
  });

  it('returns 502 response when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await createUser();
    expect(response.status).toBe(502);
  });

  it('returns email failure message when sending email fails', async () => {
    simulateSmtpFailure = true;
    const response = await createUser();
    expect(response.body.message).toBe(en.email_failure);
  });

  it('does not save user to database if activation email fails', async () => {
    simulateSmtpFailure = true;
    await createUser();
    const users = await User.findAll();
    expect(users.length).toBe(0);
  });

  it('returns validation failure message in error response body when validation fails', async () => {
    const response = await createUser({
      username: null,
      email: validUser.email,
      password: 'P4ssword',
    });
    expect(response.body.message).toBe(en.validation_failure);
  });
});

describe('Internationalization', () => {
  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${es.username_null}
    ${'username'} | ${'usr'}           | ${es.username_length}
    ${'username'} | ${'a'.repeat(33)}  | ${es.username_length}
    ${'email'}    | ${null}            | ${es.email_null}
    ${'email'}    | ${'mail.com'}      | ${es.email_invalid}
    ${'email'}    | ${'test.mail.com'} | ${es.email_invalid}
    ${'email'}    | ${'test@mail'}     | ${es.email_invalid}
    ${'password'} | ${null}            | ${es.password_null}
    ${'password'} | ${'passw'}         | ${es.password_length}
    ${'password'} | ${'alllowercase'}  | ${es.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${es.password_pattern}
    ${'password'} | ${'123456789'}     | ${es.password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${es.password_pattern}
    ${'password'} | ${'lowerand1234'}  | ${es.password_pattern}
    ${'password'} | ${'UPPERAND1234'}  | ${es.password_pattern}
  `(
    'returns "$expectedMessage" if $field is $value when language is set to Spanish',
    async ({ field, expectedMessage, value }) => {
      const user = {
        username: 'test1',
        email: 'test@test.com',
        password: 'P4ssword',
      };
      user[field] = value;
      const response = await createUser(user, { language: 'es' });
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns "${es.email_inuse}" if email is already in use when language is set to Spanish`, async () => {
    await User.create({ ...validUser });
    const response = await createUser({ ...validUser }, { language: 'es' });
    expect(response.body.validationErrors.email).toBe(es.email_inuse);
  });

  it(`returns a success message of ${es.user_create_success} on successful signup request when language is set to Spanish`, async () => {
    const response = await createUser({ ...validUser }, { language: 'es' });
    expect(response.body.message).toBe(es.user_create_success);
  });

  it(`returns ${es.email_failure} message when sending email fails when language is set to Spanish`, async () => {
    simulateSmtpFailure = true;
    const response = await createUser({ ...validUser }, { language: 'es' });
    expect(response.body.message).toBe(es.email_failure);
  });

  it(`returns ${es.validation_failure} message in error response body when validation fails`, async () => {
    const response = await createUser(
      {
        username: null,
        email: validUser.email,
        password: 'P4ssword',
      },
      { language: 'es' }
    );
    expect(response.body.message).toBe(es.validation_failure);
  });
});

describe('Account activation', () => {
  it('activates the user account when correct token is sent', async () => {
    await createUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/v1/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].inactive).toBe(false);
  });

  it('removes the token from the user table after successful activation', async () => {
    await createUser();
    let users = await User.findAll();
    const token = users[0].activationToken;

    await request(app)
      .post('/api/v1/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].activationToken).toBeFalsy();
  });

  it('does not activate the account when token does not match user token', async () => {
    await createUser();
    const token = 'this-token-does-not-exist';
    await request(app)
      .post('/api/v1/users/token/' + token)
      .send();
    const users = await User.findAll();
    expect(users[0].inactive).toBe(true);
  });

  it('returns bad request when token does not match user token', async () => {
    await createUser();
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/v1/users/token/' + token)
      .send();
    expect(response.status).toBe(400);
  });

  it.each`
    language | tokenStatus  | message
    ${'es'}  | ${'wrong'}   | ${es.account_activation_failure}
    ${'en'}  | ${'wrong'}   | ${en.account_activation_failure}
    ${'es'}  | ${'correct'} | ${es.account_activation_success}
    ${'en'}  | ${'correct'} | ${en.account_activation_success}
  `(
    'returns $message when token is $tokenStatus and language is $language',
    async ({ language, tokenStatus, message }) => {
      await createUser();
      let token = 'this-token-does-not-exist';
      if (tokenStatus === 'correct') {
        let users = await User.findAll();
        token = users[0].activationToken;
      }
      const response = await request(app)
        .post('/api/v1/users/token/' + token)
        .set('Accept-Language', language)
        .send();
      expect(response.body.message).toBe(message);
    }
  );
});

describe('Error Model', () => {
  it('returns path, timestamp, message and validationErrors in response on validation failure', async () => {
    const response = await createUser({ ...validUser, username: null });
    const body = response.body;
    expect(Object.keys(body)).toEqual([
      'path',
      'timestamp',
      'message',
      'validationErrors',
    ]);
  });

  it('returns path, timestamp, and message in response when request fails for non-validation reasons', async () => {
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/v1/users/token/' + token)
      .send();
    const body = response.body;
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message']);
  });

  it('returns path in error body', async () => {
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/v1/users/token/' + token)
      .send();
    const body = response.body;
    expect(body.path).toEqual('/api/v1/users/token/' + token);
  });

  it('returns timestamp in milliseconds within 5 seconds in error body', async () => {
    const nowInMillis = new Date().getTime();
    const fiveSecondsLater = nowInMillis + 5 * 1000;
    const token = 'this-token-does-not-exist';
    const response = await request(app)
      .post('/api/v1/users/token/' + token)
      .send();
    const body = response.body;
    expect(body.timestamp).toBeGreaterThan(nowInMillis);
    expect(body.timestamp).toBeLessThan(fiveSecondsLater);
  });
});
