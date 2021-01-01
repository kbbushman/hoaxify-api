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

  it.each`
    field         | value              | expectedMessage
    ${'username'} | ${null}            | ${'Username cannot be null'}
    ${'username'} | ${'usr'}           | ${'Must have min 4 and max 32 characters'}
    ${'username'} | ${'a'.repeat(33)}  | ${'Must have min 4 and max 32 characters'}
    ${'email'}    | ${null}            | ${'Email cannot be null'}
    ${'email'}    | ${'mail.com'}      | ${'Email is not valid'}
    ${'email'}    | ${'test.mail.com'} | ${'Email is not valid'}
    ${'email'}    | ${'test@mail'}     | ${'Email is not valid'}
    ${'password'} | ${null}            | ${'Password cannot be null'}
    ${'password'} | ${'passw'}         | ${'Password must be at least 6 characters'}
    ${'password'} | ${'alllowercase'}  | ${'Password must have at least 1 lowercase letter, 1 uppercase letter, and 1 number'}
    ${'password'} | ${'ALLUPPERCASE'}  | ${'Password must have at least 1 lowercase letter, 1 uppercase letter, and 1 number'}
    ${'password'} | ${'123456789'}     | ${'Password must have at least 1 lowercase letter, 1 uppercase letter, and 1 number'}
    ${'password'} | ${'lowerandUPPER'} | ${'Password must have at least 1 lowercase letter, 1 uppercase letter, and 1 number'}
    ${'password'} | ${'lowerand1234'}  | ${'Password must have at least 1 lowercase letter, 1 uppercase letter, and 1 number'}
    ${'password'} | ${'UPPERAND1234'}  | ${'Password must have at least 1 lowercase letter, 1 uppercase letter, and 1 number'}
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
});
