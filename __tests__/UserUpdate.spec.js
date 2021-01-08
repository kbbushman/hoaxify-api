const request = require('supertest');
// const bcrypt = require('bcrypt');
const app = require('../src/server');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const en = require('../locales/en/translation.json');
const es = require('../locales/es/translation.json');

beforeAll(async () => {
  await sequelize.sync();
});

beforeEach(async () => {
  await User.destroy({ truncate: true });
});

describe('User Update', () => {
  it('returns forbidden when request sent without basic authorization', async () => {
    const response = await request(app).put('/api/v1/users/5').send();
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'es'}  | ${es.unauthorized_user_update}
    ${'en'}  | ${en.unauthorized_user_update}
  `(
    'returns error body with $message for unauthorized request when language is set to $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await request(app)
        .put('/api/v1/users/5')
        .set('Accept-Language', language)
        .send();
      expect(response.body.path).toBe('/api/v1/users/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );
});
