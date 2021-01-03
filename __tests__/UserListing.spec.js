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

describe('Listing Users', () => {
  it('returns 200 ok when there are no users in the database', async () => {
    const response = await request(app).get('/api/v1/users');
    expect(response.status).toBe(200);
  });

  it('returns page object as response body', async () => {
    const response = await request(app).get('/api/v1/users');
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });

  it('returns 10 users in page content when there are 11 users in the database', async () => {
    for (let i = 0; i < 11; i++) {
      await User.create({
        username: `user${i + 1}`,
        email: `user${i + 1}@test.com`,
      });
    }
    const response = await request(app).get('/api/v1/users');
    expect(response.body.content.length).toBe(10);
  });
});
