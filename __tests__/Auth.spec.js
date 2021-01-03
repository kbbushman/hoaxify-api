const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/server');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
});

const addUser = async () => {
  const user = {
    username: 'test1',
    email: 'test@test.com',
    password: 'P4ssword',
    inactive: false,
  };
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const postAuthentication = async (credentials, options = {}) => {
  let agent = request(app).post('/api/v1/auth');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return await agent.send(credentials);
};

describe('Authentication', () => {
  it('returns 200 when credentials are correct', async () => {
    await addUser();
    const response = await postAuthentication({
      email: 'test@test.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(200);
  });

  it('returns only user id and username when login success', async () => {
    const user = await addUser();
    const response = await postAuthentication({
      email: 'test@test.com',
      password: 'P4ssword',
    });
    expect(response.body.id).toBe(user.id);
    expect(response.body.username).toBe(user.username);
    expect(Object.keys(response.body)).toEqual(['id', 'username']);
  });

  it('returns 401 when user does not exist', async () => {
    const response = await postAuthentication({
      email: 'test@test.com',
      password: 'P4ssword',
    });
    expect(response.status).toBe(401);
  });

  it('returns proper error body when authenticaion fails', async () => {
    const nowInMillis = new Date().getTime();
    const response = await postAuthentication({
      email: 'test@test.com',
      password: 'P4ssword',
    });
    const error = response.body;
    expect(error.path).toBe('/api/v1/auth');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });
});
