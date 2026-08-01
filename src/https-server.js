const tls = require('node:tls');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const setupListener = require('./setup-listener');

Promise.all(['cert.pem', 'key.pem'].map(file => readFile(path.join(__dirname, '..', file))))
  .then(([cert, key]) => {
    const server = tls.createServer({ key, cert }, socket => {
      setupListener(socket);
    }).listen(3443, () => {
      console.log('HTTPS server is running on port 3443');
    });
  })
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
