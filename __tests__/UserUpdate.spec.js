const fs = require('fs');
const path = require('path');
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../src/server');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const en = require('../locales/en/translation.json');
const es = require('../locales/es/translation.json');
const config = require('config');

const { uploadDir, profileDir } = config;
const profileDirectory = path.join('.', uploadDir, profileDir);

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

const readFileAsBase64 = (file = 'test-png.png') => {
  const filePath = path.join('.', '__tests__', 'resources', file);
  return fs.readFileSync(filePath, { encoding: 'base64' });
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
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'test1-updated', image: fileInBase64 };
    await updateUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    expect(inDBUser.image).toBeTruthy();
  });

  it('returns success body with id, username, email and image only', async () => {
    const fileInBase64 = readFileAsBase64();
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

  it('saves the user image to upload folder and stores filename in user when request has image', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'test1-updated', image: fileInBase64 };
    await updateUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    const inDBUser = await User.findOne({ where: { id: savedUser.id } });
    const profileImagePath = path.join(profileDirectory, inDBUser.image);
    expect(fs.existsSync(profileImagePath)).toBe(true);
  });

  it('removes the old image after user uploads new image', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'test1-updated', image: fileInBase64 };
    const response = await updateUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    const firstImage = response.body.image;

    await updateUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    const profileImagePath = path.join(profileDirectory, firstImage);
    expect(fs.existsSync(profileImagePath)).toBe(false);
  });

  it.each`
    language | value             | message
    ${'en'}  | ${null}           | ${en.username_null}
    ${'en'}  | ${'usr'}          | ${en.username_length}
    ${'en'}  | ${'a'.repeat(33)} | ${en.username_length}
    ${'es'}  | ${null}           | ${es.username_null}
    ${'es'}  | ${'usr'}          | ${es.username_length}
    ${'es'}  | ${'a'.repeat(33)} | ${es.username_length}
  `(
    'returns bad request with $message when username is updated with $value and language is set to $language',
    async ({ language, value, message }) => {
      const savedUser = await addUser();
      const invalidUpdate = { username: value };
      const response = await updateUser(savedUser.id, invalidUpdate, {
        auth: { email: savedUser.email, password: 'P4ssword' },
        language: language,
      });
      expect(response.status).toBe(400);
      expect(response.body.validationErrors.username).toBe(message);
    }
  );

  it('returns 200 when the image size is exactly 2mb', async () => {
    const testPng = readFileAsBase64();
    const pngByte = Buffer.from(testPng, 'base64').length;
    const twoMB = 1024 * 1024 * 2;
    const filling = 'a'.repeat(twoMB - pngByte);
    const fillBase64 = Buffer.from(filling).toString('base64');
    const savedUser = await addUser();
    const validUpdate = {
      username: 'updated-user',
      image: testPng + fillBase64,
    };
    const response = await updateUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(200);
  });

  it('returns 400 when image size exceeds 2mb', async () => {
    const fileWithSizeExceeding2MB = 'a'.repeat(1024 * 1024 * 2) + 'a';
    const base64 = Buffer.from(fileWithSizeExceeding2MB).toString('base64');
    const savedUser = await addUser();
    const invalidUpdate = { username: 'updated-user', image: base64 };
    const response = await updateUser(savedUser.id, invalidUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });
    expect(response.status).toBe(400);
  });

  it('keeps the old image if user only updates username', async () => {
    const fileInBase64 = readFileAsBase64();
    const savedUser = await addUser();
    const validUpdate = { username: 'test1-updated', image: fileInBase64 };
    const response = await updateUser(savedUser.id, validUpdate, {
      auth: { email: savedUser.email, password: 'P4ssword' },
    });

    const firstImage = response.body.image;

    await updateUser(
      savedUser.id,
      { username: 'user1-updated2' },
      {
        auth: { email: savedUser.email, password: 'P4ssword' },
      }
    );

    const profileImagePath = path.join(profileDirectory, firstImage);
    expect(fs.existsSync(profileImagePath)).toBe(true);

    const userInDb = await User.findOne({ where: { id: savedUser.id } });
    expect(userInDb.image).toBe(firstImage);
  });

  it.each`
    language | message
    ${'es'}  | ${es.profile_image_size}
    ${'en'}  | ${en.profile_image_size}
  `(
    'returns $message when file size exceeds 2mb when language is $language',
    async ({ language, message }) => {
      const fileWithExceeding2MB = 'a'.repeat(1024 * 1024 * 2) + 'a';
      const base64 = Buffer.from(fileWithExceeding2MB).toString('base64');
      const savedUser = await addUser();
      const invalidUpdate = { username: 'updated-user', image: base64 };
      const response = await updateUser(savedUser.id, invalidUpdate, {
        auth: { email: savedUser.email, password: 'P4ssword' },
        language,
      });
      expect(response.body.validationErrors.image).toBe(message);
    }
  );

  it.each`
    file              | status
    ${'test-gif.gif'} | ${400}
    ${'test-pdf.pdf'} | ${400}
    ${'test-txt.txt'} | ${400}
    ${'test-png.png'} | ${200}
  `(
    'returns $status when uploading $file as image',
    async ({ file, status }) => {
      const fileInBase64 = readFileAsBase64(file);
      const savedUser = await addUser();
      const updateBody = { username: 'user1-updated', image: fileInBase64 };
      const response = await updateUser(savedUser.id, updateBody, {
        auth: { email: savedUser.email, password: 'P4ssword' },
      });
      expect(response.status).toBe(status);
    }
  );
});
