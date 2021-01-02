const request = require('supertest');
const app = require('../src/server');

describe('Listing Users', () => {
  it('returns 200 ok when there are no users in the database', async () => {
    const response = await request(app).get('/api/v1/users');
    expect(response.status).toBe(200);
  });
});
