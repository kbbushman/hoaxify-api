const request = require('supertest');
const app = require('../src/server');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
});

const validUser = {
  username: 'test1',
  email: 'test@test.com',
  password: 'P4ssword',
};

const createUser = (user = validUser) => {
  return request(app).post('/api/v1/users').send(user);
};

describe('User Registration', () => {
  it('returns 200 on successful signup request', async () => {
    const response = await createUser();
    expect(response.status).toBe(200);
  });

  it('returns a success message on successful signup request', async () => {
    const response = await createUser();
    expect(response.body.message).toBe('User created successfully');
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

  const username_null = 'Username cannot be null';
  const username_length = 'Must have min 4 and max 32 characters';
  const email_null = 'Email cannot be null';
  const email_invalid = 'Email is not valid';
  const password_null = 'Password cannot be null';
  const password_length = 'Password must be at least 6 characters';
  const password_pattern =
    'Password must have at least 1 lowercase letter, 1 uppercase letter, and 1 number';
  const email_inuse = 'Email already in use';

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${username_null}
    ${'username'} | ${'usr'}           | ${username_length}
    ${'username'} | ${'a'.repeat(33)}  | ${username_length}
    ${'email'}    | ${null}            | ${email_null}
    ${'email'}    | ${'mail.com'}      | ${email_invalid}
    ${'email'}    | ${'test.mail.com'} | ${email_invalid}
    ${'email'}    | ${'test@mail'}     | ${email_invalid}
    ${'password'} | ${null}            | ${password_null}
    ${'password'} | ${'passw'}         | ${password_length}
    ${'password'} | ${'alllowercase'}  | ${password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}  | ${password_pattern}
    ${'password'} | ${'123456789'}     | ${password_pattern}
    ${'password'} | ${'lowerandUPPER'} | ${password_pattern}
    ${'password'} | ${'lowerand1234'}  | ${password_pattern}
    ${'password'} | ${'UPPERAND1234'}  | ${password_pattern}
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

  it('returns "Email already in use" when email is already in use', async () => {
    await User.create({ ...validUser });
    const response = await createUser();
    expect(response.body.validationErrors.email).toBe('Email already in use');
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
});
