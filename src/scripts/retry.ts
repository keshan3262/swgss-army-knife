import { In } from 'typeorm';
import { clearDb } from '../clear-db';
import { Conversion } from '../entities/conversion';
import { ConversionStatus, ImageFormat } from '../entities/enums';
import { SourceImage } from '../entities/source-image';
import { User } from '../entities/user';
import { seed } from '../seed-fn';
import { withDataSourceInitialization } from '../with-data-source-initialization';
import { ConversionHandler } from '../entities/conversion-handler';
import { ConvertedVersion } from '../entities/converted-version';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

withDataSourceInitialization(async ds => {
  await clearDb(ds);
  await seed(ds, false);

  const [user] = await ds.getRepository(User).find({});
  const { identifiers: [conversionId] } = await ds.getRepository(Conversion).insert({
    user: user!,
    destinationFormat: ImageFormat.PNG
  });

  const { identifiers: sourceImageIds } = await ds.getRepository(SourceImage).insert([
    {
      conversion: conversionId,
      format: ImageFormat.PNG,
      originalName: 'img1.png',
      size: '1000',
      storageUrl: 'https://example.com/img1.png'
    },
    {
      conversion: conversionId,
      format: ImageFormat.PNG,
      originalName: 'img2.png',
      size: '1000',
      storageUrl: 'https://example.com/img2.png'
    }
  ]);
  const [handler] = await ds.getRepository(ConversionHandler).find({ where: { name: 'oxipng' } });

  await Promise.all(sourceImageIds.map(async ({ id: siId }, i) => {
    const runner = ds.createQueryRunner();
    try {
      await runner.connect();
      let attempt = 0;
      while (true) {
        try {
          await runner.startTransaction('SERIALIZABLE');
          const [{ conversion_id: conversionId }] = await runner.query(
            `SELECT conversion_id FROM source_images WHERE id = $1`,
            [siId]
          );
          const [{ destination_format: destinationFormat }] = await runner.query(
            `SELECT destination_format FROM conversions WHERE id = $1`,
            [conversionId]
          );
          await sleep(200);
          await runner.query(
            `INSERT INTO converted_versions (source_image_id, format, size, storage_url) VALUES ($1, $2, $3, $4)`,
            [siId, destinationFormat, '1000', `https://example.com/img${i+1}-out.png`]
          );
          await runner.query(`UPDATE source_images SET processed = processed + 1 WHERE id = $1`, [siId]);
          await runner.query(
            `UPDATE conversion_handlers SET pts_left = pts_left + 1 WHERE id = $1`,
            [handler.id]
          );
          await runner.query(
            `UPDATE conversions c SET status = 'completed' \
WHERE c.id = $1 AND NOT EXISTS (SELECT 1 FROM source_images si WHERE si.conversion_id = c.id AND si.processed = 0) \
AND NOT EXISTS (SELECT 1 FROM source_images si WHERE si.conversion_id = c.id AND si.conversion_error IS NOT NULL)`,
            [conversionId]
          );
          await runner.commitTransaction();
          break;
        } catch (error) {
          if (runner.isTransactionActive) {
            await runner.rollbackTransaction();
          }

          const errorCode = (error as any)?.code;
          if (errorCode === '40001' || errorCode === '40P01') {
            console.log('Serialization failure, retrying...');
            await sleep(2 ** attempt++ * 10);

            continue;
          }

          throw error;
        }
      }
    } finally {
      if (!runner.isReleased) {
        await runner.release();
      }
    }
  }));

  const finalConversion = await ds.getRepository(Conversion).findOne(
    { where: { id: conversionId.id }, relations: ['sourceImages'] }
  );
  if (finalConversion!.status !== ConversionStatus.COMPLETED) {
    throw new Error('Conversion is not completed');
  }

  const convertedVersions = await ds.getRepository(ConvertedVersion).find(
    { where: { sourceImage: In(finalConversion!.sourceImages.map(si => si.id)) }, relations: ['sourceImage'] }
  );
  
  const imagesIdsFromConvertedVersions = convertedVersions.map(cv => cv.sourceImage.id).sort().join(',');
  const imagesIdsFromSourceImages = finalConversion!.sourceImages.map(si => si.id).sort().join(',');
  if (imagesIdsFromConvertedVersions !== imagesIdsFromSourceImages) {
    throw new Error(`Source images IDs mismatch: ${imagesIdsFromConvertedVersions} !== ${imagesIdsFromSourceImages}`);
  }
});
