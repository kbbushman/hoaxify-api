const request = require('supertest');
const app = require('../src/server');
const en = require('../locales/en/translation.json');
const es = require('../locales/es/translation.json');

describe('Password Reset Request', () => {
  it('returns 404 when a password reset request is sent for unknown email', async () => {
    const response = await request(app)
      .post('/api/v1/password-reset')
      .send({ email: 'user1@test.com' });
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'es'}  | ${es.email_not_in_use}
    ${'en'}  | ${en.email_not_in_use}
  `(
    'returns error body with $message for unknown email password reset request when language is set to $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await request(app)
        .post('/api/v1/users/password-reset')
        .set('Accept-Language', language)
        .send({ email: 'user1@test.com' });
      expect(response.body.path).toBe('/api/v1/users/password-reset');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );
});
