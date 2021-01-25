const fs = require('fs');
const path = require('path');

const createFolders = () => {
  const uploadDir = 'upload';
  const profileFolder = path.join('.', 'upload', 'profile');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  if (!fs.existsSync(profileFolder)) {
    fs.mkdirSync(profileFolder);
  }
};

module.exports = {
  createFolders,
};
