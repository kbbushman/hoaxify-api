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

const auth = async (options = {}) => {
  let token;
  if (options.auth) {
    const response = await request(app).post('/api/v1/auth').send(options.auth);
    token = response.body.token;
  }
  return token;
};

const deleteUser = async (id = 5, options = {}) => {
  const agent = request(app).delete(`/api/v1/users/${id}`);
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }
  return agent.send();
};

describe('User Delete', () => {
  it('returns forbidden when unauthorized request sent', async () => {
    const response = await deleteUser();
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'es'}  | ${es.unauthorized_user_delete}
    ${'en'}  | ${en.unauthorized_user_delete}
  `(
    'returns error body with $message for unauthorized request when language is set to $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await deleteUser(5, { language });
      expect(response.body.path).toBe('/api/v1/users/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns forbidden when delete request is sent with correct credentials for different user', async () => {
    await addUser();
    const userToBeDeleted = await addUser({
      ...activeUser,
      username: 'use2',
      email: 'user2@gmail.com',
    });
    const token = await auth({
      auth: { email: 'test1@gmail.com', password: 'Passwrod' },
    });
    const response = await deleteUser(userToBeDeleted.id, { token });
    expect(response.status).toBe(403);
  });

  it('returns 403 when token is not valid', async () => {
    const response = await deleteUser(5, { token: '123' });
    expect(response.status).toBe(403);
  });

  // it('returns 200 ok when valid update request sent from authorized user', async () => {
  //   const savedUser = await addUser();
  //   const validUpdate = { username: 'test1-updated' };
  //   const response = await updateUser(savedUser.id, validUpdate, {
  //     auth: { email: savedUser.email, password: 'P4ssword' },
  //   });
  //   expect(response.status).toBe(200);
  // });

  // it('updates username in databse when valid update request sent from authorized user', async () => {
  //   const savedUser = await addUser();
  //   const validUpdate = { username: 'test1-updated' };
  //   await updateUser(savedUser.id, validUpdate, {
  //     auth: { email: savedUser.email, password: 'P4ssword' },
  //   });
  //   const inDBUser = await User.findOne({ where: { id: savedUser.id } });
  //   expect(inDBUser.username).toBe(validUpdate.username);
  // });
});
