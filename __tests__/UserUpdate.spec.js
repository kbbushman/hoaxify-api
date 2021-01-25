const fs = require('fs');
const path = require('path');
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
  await User.destroy({ truncate: { cascade: true } });
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

const updateUser = async (id = 5, body = null, options = {}) => {
  let agent = request(app);
  let token;

  if (options.auth) {
    const response = await agent.post('/api/v1/auth').send(options.auth);
    token = response.body.token;
  }

  agent = request(app).put(`/api/v1/users/${id}`);

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }

  if (token) {
    agent.set('Authorization', `Bearer ${token}`);
  }

  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
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

  it('returns 403 when token is not valid', async () => {
    const response = await updateUser(5, null, { token: '123' });
    expect(response.status).toBe(403);
  });

  it('saves the user image when update contains image in base64 encoding', async () => {
    const filePath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const fileInBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
    const savedUser = await addUser();
    const validUpdate = { username: 'test1-updated', image: fileInBase64 };
    await updateUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser.image).toBeTruthy();
  });

  it('returns success body with id, username, email and image only', async () => {
    const filePath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const fileInBase64 = fs.readFileSync(filePath, { encoding: 'base64' });
    const savedUser = await addUser();
    const validUpdate = { username: 'test1-updated', image: fileInBase64 };
    const response = await updateUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    expect(Object.keys(response.body)).toEqual([
      'id',
      'username',
      'email',
      'image',
    ]);
  });
});
