const request = require('supertest');
const app = require('../src/server');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
});

const getUsers = () => {
  return request(app).get('/api/v1/users');
};

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@test.com`,
      inactive: i >= activeUserCount,
    });
  }
};

describe('Listing Users', () => {
  it('returns 200 ok when there are no users in the database', async () => {
    const response = await getUsers();
    expect(response.status).toBe(200);
  });

  it('returns page object as response body', async () => {
    const response = await getUsers();
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });

  it('returns 10 users in page content when there are 11 users in the database', async () => {
    await addUsers(11);
    const response = await getUsers();
    expect(response.body.content.length).toBe(10);
  });

  it('returns 6 users in page content when there are 6 active users and 5 inactive users in the database', async () => {
    await addUsers(6, 5);
    const response = await getUsers();
    expect(response.body.content.length).toBe(6);
  });
});
