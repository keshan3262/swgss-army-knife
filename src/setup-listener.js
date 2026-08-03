const newlineSeparator = '\r\n';
const bodySeparator = '\r\n\r\n';

const respond = (socket, fullStatus, body) => {
  socket.end(`HTTP/1.1 ${fullStatus}${newlineSeparator}\
Content-Type: text/plain${newlineSeparator}\
Content-Length: ${Buffer.byteLength(body, 'latin1')}${bodySeparator}${body}`);
};

const setupListener = socket => {
  let parseState = 'start';
  let requestPart = '';
  let method;
  let path;
  let protocol;
  let body;
  let contentLength;
  let leftContentLength;
  let headers = [];
  socket.on('data', data => {
    requestPart += data.toString('latin1');
    if (parseState === 'start') {
      const newlineIndex = requestPart.indexOf(newlineSeparator);
      if (newlineIndex > -1) {
        const requestLine = requestPart.substring(0, newlineIndex);
        [method, path, protocol] = requestLine.split(' ');
        parseState = 'headers';
        requestPart = requestPart.substring(newlineIndex + newlineSeparator.length);
        headers = [];
      }
    }
    if (parseState === 'headers') {
      const bodySeparatorIndex = requestPart.indexOf(bodySeparator);
      if (bodySeparatorIndex > -1) {
        const headersStr = requestPart.substring(0, bodySeparatorIndex);
        headers = headersStr.split(newlineSeparator).map(header => {
          const [key, value] = header.split(': ');
          return { key: key.toLowerCase(), value };
        });
        requestPart = requestPart.substring(bodySeparatorIndex + bodySeparator.length);
        if (headers.some(header => header.key === 'content-length')) {
          parseState = 'body';
          contentLength = parseInt(headers.find(header => header.key === 'content-length').value);
          leftContentLength = contentLength;
        } else {
          body = '';
          parseState = 'finished';
        }
      }
    }
    if (parseState === 'body' && leftContentLength > 0) {
      const bodyChunk = requestPart.substring(0, leftContentLength);
      body += bodyChunk;
      leftContentLength -= bodyChunk.length;
      requestPart = requestPart.substring(bodyChunk.length);
    }
    if (parseState === 'body' && leftContentLength === 0) {
      parseState = 'finished';
    }
    if (parseState === 'finished') {
      requestPart = '';
      if (method === 'GET' && path === '/') {
        respond(socket, '200 OK', '');
      } else if (method === 'GET' && path === '/headers') {
        const responseContent = headers.map(header => `${header.key}: ${header.value}`).join(newlineSeparator);
        respond(socket, '200 OK', responseContent);
      } else {
        respond(socket, '404 Not Found', '');
      }
      parseState = 'start';
    }
  });
};

module.exports = setupListener;
