import { createHash } from 'node:crypto';
import { withAsyncException } from './with-async-exception';

const getFilesHashes = (files: Express.Multer.File[]) => files.map(file => createHash('sha256').update(file.buffer).digest('hex'));

export const filesHashesMiddleware = withAsyncException(async (req, res, next) => {
  const files = req.files;

  // TODO: Add worker threads to calculate hashes in parallel
  if (Array.isArray(files)) {
    res.locals.filesHashes = getFilesHashes(files);
  } else if (files) {
    res.locals.filesHashes = Object.fromEntries(
      Object.entries(files).map(([key, files]) => [key, getFilesHashes(files)])
    );
  }

  next();
});
