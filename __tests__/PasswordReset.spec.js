const request = require('supertest');
const app = require('../src/server');
const en = require('../locales/en/translation.json');
const es = require('../locales/es/translation.json');

const postPasswordReset = (email = 'test@test.com', options = {}) => {
  const agent = request(app).post('/api/v1/users/password-reset');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send({ email });
};

describe('Password Reset Request', () => {
  it('returns 404 when a password reset request is sent for unknown email', async () => {
    const response = await postPasswordReset();
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
      const response = await postPasswordReset('test@test.com', { language });
      expect(response.body.path).toBe('/api/v1/users/password-reset');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );
});
