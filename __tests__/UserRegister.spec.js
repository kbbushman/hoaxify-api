const request = require('supertest');
const app = require('../src/server');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
});

describe('User Registration', () => {
  const createUser = () => {
    return request(app).post('/api/v1/users').send({
      username: 'test1',
      email: 'test@test.com',
      password: '1234',
    });
  };

  it('returns 200 on successful signup request', (done) => {
    createUser().then((response) => {
      expect(response.status).toBe(200);
      done();
    });
  });

  it('returns a success message on successful signup request', (done) => {
    createUser().then((response) => {
      expect(response.body.message).toBe('User created successfully');
      done();
    });
  });

  it('saves the user to the database', (done) => {
    createUser().then(() => {
      User.findAll().then((userList) => {
        expect(userList.length).toBe(1);
        done();
      });
    });
  });

  it('saves the username and email to the database', (done) => {
    createUser().then(() => {
      User.findAll().then((userList) => {
        const savedUser = userList[0];
        expect(savedUser.username).toBe('test1');
        expect(savedUser.email).toBe('test@test.com');
        done();
      });
    });
  });

  it('saves password hash to the database', (done) => {
    createUser().then(() => {
      User.findAll().then((userList) => {
        const savedUser = userList[0];
        expect(savedUser.password).not.toBe('1234');
        done();
      });
    });
  });
});
