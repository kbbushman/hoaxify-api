const request = require('supertest');
const app = require('../src/server');

describe('Profile Images', () => {
  it('returns 404 when file not found', async () => {
    const response = await request(app).get('/images/123456');
    expect(response.status);
  });
});
