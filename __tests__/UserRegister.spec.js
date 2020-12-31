const request = require('supertest');
const app = require('../server');

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
});
