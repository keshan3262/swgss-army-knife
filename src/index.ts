import express, { NextFunction, Request, Response } from 'express';
import * as OpenApiValidator from 'express-openapi-validator';
import path from 'node:path';
import multer from 'multer';
import { idempotencyBeforeHandlerMiddleware } from './utils/idempotency-middleware';
import { listUsers } from './handlers/list-users';
import { ErrorWithCode } from './utils/errors';
import { getUser } from './handlers/get-user';
import { createUser } from './handlers/create-user';
import { filesHashesMiddleware } from './utils/files-hashes-middleware';
import { startConversion } from './handlers/start-conversion';
import { listConversions } from './handlers/list-conversions';
import { InvalidCursorError } from './utils/db-stub';

const {
  InternalServerError,
  RequestEntityTooLarge,
  Forbidden,
  NotAcceptable,
  NotFound,
  MethodNotAllowed,
  Unauthorized,
  UnsupportedMediaType,
  BadRequest
} = OpenApiValidator.error;

const app = express();
app.disable('x-powered-by');

app.use(express.json());

app.use(OpenApiValidator.middleware({
  apiSpec: path.join(__dirname, '..', 'openapi', 'openapi.yaml'),
  validateResponses: true,
  fileUploader: {
    storage: multer.diskStorage({}),
    limits: {
      fileSize: 1024 * 1024 * 7,
      files: 10,
      fields: 10,
      fieldSize: 1024
    }
  }
}));

app.use(filesHashesMiddleware);

app.use(idempotencyBeforeHandlerMiddleware);

app.get('/users/:id', getUser);

app.get('/users', listUsers);

app.post('/users', createUser);

app.post('/conversions/start', startConversion);

app.get('/conversions', listConversions);

const titleByStatus: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  413: 'Request Entity Too Large',
  415: 'Unsupported Media Type',
  500: 'Internal Server Error'
};

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const instance = `http://localhost:3000${req.originalUrl}`;

  if (err instanceof InternalServerError || err instanceof RequestEntityTooLarge || err instanceof Forbidden ||
    err instanceof NotAcceptable || err instanceof NotFound || err instanceof MethodNotAllowed ||
    err instanceof Unauthorized || err instanceof UnsupportedMediaType || err instanceof BadRequest) {
    const { status, message, errors } = err;
    return res.status(err.status).appendHeader('Content-Type', 'application/problem+json').json({
      type: `http://localhost:3000/problems/${status}`,
      title: titleByStatus[status] ?? 'Unknown Error',
      status,
      detail: message,
      instance,
      errors: errors.length === 0 ? undefined : errors
    });
  }

  if (err instanceof ErrorWithCode) {
    return res.status(err.statusCode).appendHeader('Content-Type', 'application/problem+json').json({
      type: `http://localhost:3000/problems/${err.typeCode}`,
      title: titleByStatus[err.statusCode] ?? 'Unknown Error',
      status: err.statusCode,
      detail: err.message,
      instance
    });
  }

  if (err instanceof InvalidCursorError) {
    return res.status(400).appendHeader('Content-Type', 'application/problem+json').json({
      type: `http://localhost:3000/problems/400`,
      title: 'Bad Request',
      status: 400,
      detail: err.message,
      instance
    });
  }

  next(err);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
