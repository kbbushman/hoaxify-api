const request = require('supertest');
const bcrypt = require('bcrypt');
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

const activeUser = {
  username: 'test1',
  email: 'test@test.com',
  password: 'P4ssword',
  inactive: false,
};

const addUser = async (user = { ...activeUser }) => {
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  return await User.create(user);
};

const updateUser = (id = 5, body = null, options = {}) => {
  const agent = request(app).put(`/api/v1/users/${id}`);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  if (options.auth) {
    const { email, password } = options.auth;
    agent.auth(email, password);
  }
  return agent.send(body);
};

describe('User Update', () => {
  it('returns forbidden when request sent without basic authorization', async () => {
    const response = await updateUser();
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
      const response = await updateUser(5, null, { language });
      expect(response.body.path).toBe('/api/v1/users/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns forbidden when request sent with incorrect email in basic authorization', async () => {
    await addUser();
    const response = await updateUser(5, null, {
      auth: { email: 'test1000@gmail.com', password: 'P4sswrod' },
    });
    expect(response.status).toBe(403);
  });

  it('returns forbidden when request sent with incorrect password in basic authorization', async () => {
    await addUser();
    const response = await updateUser(5, null, {
      auth: { email: 'test1@gmail.com', password: 'Passwrod' },
    });
    expect(response.status).toBe(403);
  });

  it('returns forbidden when update request is sent with correct credentials for different user', async () => {
    await addUser();
    const userToBeUpdated = await addUser({
      ...activeUser,
      username: 'use2',
      email: 'user2@gmail.com',
    });
    const response = await updateUser(userToBeUpdated.id, null, {
      auth: { email: 'test1@gmail.com', password: 'Passwrod' },
    });
    expect(response.status).toBe(403);
  });

  it('returns forbidden when update request is sent by inactive user with correct credentials', async () => {
    const inactiveUser = await addUser({ ...activeUser, inactive: true });
    const response = await updateUser(inactiveUser.id, null, {
      auth: { email: 'test1@gmail.com', password: 'P4sswrod' },
    });
    expect(response.status).toBe(403);
  });

  it('returns 200 ok when valid update request sent from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'test1-updated' };
    const response = await updateUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(200);
  });

  it('updates username in databse when valid update request sent from authorized user', async () => {
    const savedUser = await addUser();
    const validUpdate = { username: 'test1-updated' };
    await updateUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser.username).toBe(validUpdate.username);
  });
});
