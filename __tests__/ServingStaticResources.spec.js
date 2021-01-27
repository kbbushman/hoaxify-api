const fs = require('fs');
const path = require('path');
const request = require('supertest');
const config = require('config');
const app = require('../src/server');
const { uploadDir, profileDir } = config;
const profileFolder = path.join('.', uploadDir, profileDir);

describe('Profile Images', () => {
  it('returns 404 when file not found', async () => {
    const response = await request(app).get('/images/123456');
    expect(response.status).toBe(404);
  });

  it('returns 200 when file exists', async () => {
    const filePath = path.join('.', '__tests__', 'resources', 'test-png.png');
    const storedFileName = 'test-file';
    const targetPath = path.join(profileFolder, storedFileName);
    fs.copyFileSync(filePath, targetPath);
    const response = await request(app).get('/images/' + storedFileName);
    expect(response.status).toBe(200);
  });
});
