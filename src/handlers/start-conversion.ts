import { createConversion, ImageFormat } from '../utils/db-stub';
import { withAsyncException } from '../utils/with-async-exception';

const imgFormatAliasToFormat: Record<string, ImageFormat> = {
  jpg: 'jpeg',
  jpe: 'jpeg',
  jfif: 'jpeg',
  pjpeg: 'jpeg',
  pjp: 'jpeg'
};

export const startConversion = withAsyncException(async (req, res) => {
  const rawFiles = req.files ?? [];
  const files = Array.isArray(rawFiles) ? rawFiles : rawFiles.images;
  const { filesHashes: rawFilesHashes } = res.locals;
  const filesHashes = Array.isArray(rawFilesHashes) ? rawFilesHashes : rawFilesHashes?.images ?? [];
  const rawFormat = req.body.destinationFormat;
  const conversion = await createConversion({
    userId: 1,
    destinationFormat: imgFormatAliasToFormat[rawFormat] ?? rawFormat,
    images: filesHashes
  });
  res.status(201).json(conversion);
});
