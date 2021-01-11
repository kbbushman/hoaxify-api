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

const getUsers = (options = {}) => {
  const agent = request(app).get('/api/v1/users');
  if (options.auth) {
    const { email, password } = options.auth;
    agent.auth(email, password);
  }
  return agent;
};

const addUsers = async (activeUserCount, inactiveUserCount = 0) => {
  const hash = await bcrypt.hash('P4ssword', 10);
  for (let i = 0; i < activeUserCount + inactiveUserCount; i++) {
    await User.create({
      username: `user${i + 1}`,
      email: `user${i + 1}@test.com`,
      inactive: i >= activeUserCount,
      password: hash,
    });
  }
};

describe('Listing Users', () => {
  it('returns 200 ok when there are no users in the database', async () => {
    const response = await getUsers();
    expect(response.status).toBe(200);
  });

  it('returns page object as response body', async () => {
    const response = await getUsers();
    expect(response.body).toEqual({
      content: [],
      page: 0,
      size: 10,
      totalPages: 0,
    });
  });

  it('returns 10 users in page content when there are 11 users in the database', async () => {
    await addUsers(11);
    const response = await getUsers();
    expect(response.body.content.length).toBe(10);
  });

  it('returns 6 users in page content when there are 6 active users and 5 inactive users in the database', async () => {
    await addUsers(6, 5);
    const response = await getUsers();
    expect(response.body.content.length).toBe(6);
  });

  it('returns id, username, and email only in content array for each user', async () => {
    await addUsers(6, 5);
    const response = await getUsers();
    const user = response.body.content[0];
    expect(Object.keys(user)).toEqual(['id', 'username', 'email']);
  });

  it('returns 2 as totalPages when there are 15 active users and 7 inactive users', async () => {
    await addUsers(15, 7);
    const response = await getUsers();
    expect(response.body.totalPages).toBe(2);
  });

  it('returns second page of users and page indicator when page is set to 1 in request parameter', async () => {
    await addUsers(11);
    const response = await getUsers().query({ page: 1 });
    expect(response.body.content[0].username).toBe('user11');
    expect(response.body.page).toBe(1);
  });

  it('returns first page when request page param is below 0', async () => {
    await addUsers(11);
    const response = await getUsers().query({ page: -5 });
    expect(response.body.content[0].username).toBe('user1');
    expect(response.body.page).toBe(0);
  });

  it('returns 5 users and corresponding size indicator when size is set to a value of 5 in request parameter', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 5 });
    expect(response.body.content.length).toBe(5);
    expect(response.body.size).toBe(5);
  });

  it('returns 10 users and corresponding size indecator when size is set to a value of 1000 in request parameter', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 1000 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns 10 users and corresponding size indecator when size is set to a value of 0 in request parameter', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 0 });
    expect(response.body.content.length).toBe(10);
    expect(response.body.size).toBe(10);
  });

  it('returns page as zero and size as 10 when non numeric query params provided', async () => {
    await addUsers(11);
    const response = await getUsers().query({ size: 'size', page: 'page' });
    expect(response.body.size).toBe(10);
    expect(response.body.page).toBe(0);
  });

  it('returns user page with out logged in user when request has valid authorization', async () => {
    await addUsers(11);
    const response = await getUsers({
      auth: { email: 'user1@test.com', password: 'P4ssword' },
    });
    expect(response.body.totalPages).toBe(1);
  });
});

describe('Get User', () => {
  const getUser = (id = 5) => {
    return request(app).get(`/api/v1/users/${id}`);
  };

  it('returns 404 when user not found', async () => {
    const response = await getUser();
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'es'}  | ${es.user_not_found}
    ${'en'}  | ${en.user_not_found}
  `(
    'returns $message for unknown user when language is set to $language',
    async ({ language, message }) => {
      const response = await request(app)
        .get('/api/v1/users/5')
        .set('Accept-Language', language);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns proper error body when user not found', async () => {
    const nowInMillis = new Date().getTime();
    const response = await getUser();
    const error = response.body;
    expect(error.path).toBe('/api/v1/users/5');
    expect(error.timestamp).toBeGreaterThan(nowInMillis);
    expect(Object.keys(error)).toEqual(['path', 'timestamp', 'message']);
  });

  it('returns 200 when an active user exists', async () => {
    const user = await User.create({
      username: 'test1',
      email: 'test1@test.com',
      inactive: false,
    });
    const response = await getUser(user.id);
    expect(response.status).toBe(200);
  });

  it('returns id, username, and email in response body when an active user exists', async () => {
    const user = await User.create({
      username: 'test1',
      email: 'test1@test.com',
      inactive: false,
    });
    const response = await getUser(user.id);
    expect(Object.keys(response.body)).toEqual(['id', 'username', 'email']);
  });

  it('returns 404 when the user is inactive', async () => {
    const user = await User.create({
      username: 'test1',
      email: 'test1@test.com',
      inactive: true,
    });
    const response = await getUser(user.id);
    expect(response.status).toBe(404);
  });
});
