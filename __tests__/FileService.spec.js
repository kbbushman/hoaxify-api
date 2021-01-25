const fs = require('fs');
const fileService = require('../src/file/fileService');

describe('Create Folders', () => {
  it('creates an upload folder', async () => {
    fileService.createFolders();
    const folderName = 'upload';
    expect(fs.existsSync(folderName)).toBe(true);
  });
});
