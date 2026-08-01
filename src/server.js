const net = require('node:net');

const setupListener = require('./setup-listener');

const server = net.createServer(socket => {
  setupListener(socket);
}).listen(3000, () => {
  console.log('Server is running on port 3000');
});
