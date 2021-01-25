const fs = require('fs');
const path = require('path');
const fileService = require('../src/file/fileService');
const config = require('config');
const { uploadDir, profileDir } = config;

describe('Create Folders', () => {
  it('creates an upload folder', async () => {
    fileService.createFolders();
    expect(fs.existsSync(uploadDir)).toBe(true);
  });

  it('creates profile folder under upload folder', async () => {
    fileService.createFolders();
    const profileFolder = path.join('.', uploadDir, profileDir);
    expect(fs.existsSync(profileFolder)).toBe(true);
  });
});
