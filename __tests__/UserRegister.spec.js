const request = require('supertest');
const app = require('../src/server');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(() => {
  return sequelize.sync();
});

describe('User Registration', () => {
  it('returns 200 on successful signup request', (done) => {
    request(app)
      .post('/api/v1/users')
      .send({
        username: 'test1',
        email: 'test@test.com',
        password: '1234',
      })
      .then((response) => {
        expect(response.status).toBe(200);
        done();
      });
  });

  it('returns a success message on successful signup request', (done) => {
    request(app)
      .post('/api/v1/users')
      .send({
        username: 'test1',
        email: 'test@test.com',
        password: '1234',
      })
      .then((response) => {
        expect(response.body.message).toBe('User created successfully');
        done();
      });
  });

  it('saves the user to the database', (done) => {
    request(app)
      .post('/api/v1/users')
      .send({
        username: 'test1',
        email: 'test@test.com',
        password: '1234',
      })
      .then(() => {
        User.findAll().then((userList) => {
          expect(userList.length).toBe(1);
          done();
        });
      });
  });
});
