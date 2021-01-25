const fs = require('fs');
const path = require('path');
const fileService = require('../src/file/fileService');

describe('Create Folders', () => {
  it('creates an upload folder', async () => {
    fileService.createFolders();
    const folderName = 'upload';
    expect(fs.existsSync(folderName)).toBe(true);
  });

  it('creates profile folder under upload folder', async () => {
    fileService.createFolders();
    const profileFolder = path.join('.', 'upload', 'profile');
    expect(fs.existsSync(profileFolder)).toBe(true);
  });
});
