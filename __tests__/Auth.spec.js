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
  await User.create(user);
};

const postAuthentication = async (credentials) => {
  return await request(app).post('/api/v1/auth').send(credentials);
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
});
