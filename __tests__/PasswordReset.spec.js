const request = require('supertest');
const app = require('../src/server');

describe('Password Reset Request', () => {
  it('returns 404 when a password reset request is sent for unknown email', async () => {
    const response = await request(app)
      .post('/api/v1/password-reset')
      .send({ email: 'user1@test.com' });
    expect(response.status).toBe(404);
  });
});
