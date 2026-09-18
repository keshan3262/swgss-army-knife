import { MoreThan } from 'typeorm';
import { SourceImage } from '../entities/source-image';
import { ImageFormat } from '../entities/enums';
import { ConversionHandler } from '../entities/conversion-handler';
import type { dataSource } from '../data-source';
import { withDataSourceInitialization } from '../with-data-source-initialization';
import { clearDb } from '../clear-db';
import { seed } from '../seed-fn';

const MOCK_WORKERS_COUNT = 4;
const MOCK_WORK_DURATION = 100;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function claimOne(
  ds: typeof dataSource,
  worker: string,
  allHandlers: ConversionHandler[],
): Promise<'done' | 'empty'> {
  const runner = ds.createQueryRunner();

  try {
    await runner.connect();
    await runner.startTransaction();

    const result: Array<
      { source_image_id: string, input_format: ImageFormat, output_format: ImageFormat, conversion_id: string }
    > = await runner.query(
      `SELECT \
si.id AS source_image_id, si.format AS input_format, c.destination_format AS output_format, c.id AS conversion_id \
FROM conversions c JOIN source_images si ON c.id = si.conversion_id \
WHERE c.status IN ('pending', 'failed') AND si.processed = 0 ORDER BY c.created_at ASC LIMIT 1 \
FOR UPDATE OF si SKIP LOCKED`
      );

    if (result.length === 0) {
      return 'empty';
    }

    const {
      source_image_id: sourceImageId,
      input_format: inputFormat,
      output_format: outputFormat,
      conversion_id: conversionId
    } = result[0];
    const handler = allHandlers.find(
      ({ sourceFormats, destinationFormats }) =>
        sourceFormats.includes(inputFormat) && destinationFormats.includes(outputFormat)
    )!;

    await sleep(MOCK_WORK_DURATION);
    await runner.query(
      `INSERT INTO converted_versions (source_image_id, format, size, storage_url) VALUES ($1, $2, $3, $4)`,
      [sourceImageId, outputFormat, 2000, `https://example.com/image-conv-${sourceImageId}.${outputFormat}`]
    );
    await runner.query(
      `UPDATE source_images SET processed = processed + 1, worker = $1 WHERE id = $2`,
      [worker, sourceImageId]
    );
    if (handler) {
      // TODO: Add handlers for all conversions
      await runner.query(
        `UPDATE conversion_handlers SET pts_left = pts_left + 1 WHERE id = $1`,
        [handler.id]
      );
    }
    await runner.query(`SELECT id FROM conversions WHERE id = $1 FOR UPDATE`, [conversionId]);
    await runner.query(
      `UPDATE conversions c SET status = 'completed' \
WHERE c.id = $1 AND NOT EXISTS (SELECT 1 FROM source_images si WHERE si.conversion_id = c.id AND si.processed = 0) \
AND NOT EXISTS (SELECT 1 FROM source_images si WHERE si.conversion_id = c.id AND si.conversion_error IS NOT NULL)`,
      [conversionId]
    );
    await runner.commitTransaction();

    return 'done';
  } catch (error) {
    if (runner.isTransactionActive) {
      await runner.rollbackTransaction();
    }
    
    throw error;
  } finally {
    if (!runner.isReleased) {
      await runner.release();
    }
  }
}

withDataSourceInitialization(async (ds) => {
  const allHandlers = await ds.getRepository(ConversionHandler).find();
  const t0 = Date.now();
  await Promise.all(
    Array.from({ length: MOCK_WORKERS_COUNT }, (_, i) => `w${i + 1}`).map(async (w) => {
      for (;;) {
        const res = await claimOne(ds, w, allHandlers);

        if (res === 'done') {
          continue;
        }

        const left = await ds.getRepository(SourceImage).count({ where: { processed: 0 } });

        if (left === 0) {
          return;
        }

        await sleep(20);
      }
    })
  );
  const elapsed = Date.now() - t0;

  const siQueryBuilder = ds.createQueryBuilder(SourceImage, 'si');
  const workerLoadStats = await siQueryBuilder
    .select('worker')
    .addSelect('COUNT(*)', 'n')
    .groupBy('worker')
    .orderBy('worker')
    .getRawMany<{ worker: string; n: number }>();
  const excessiveProcessedRowsCount = await ds.getRepository(SourceImage).count({
    where: { processed: MoreThan(1) }
  });
  console.log(`${elapsed}ms elapsed, ${excessiveProcessedRowsCount} rows processed more than once`);
  console.log('Worker load stats:');
  workerLoadStats.forEach(({ worker, n }) => {
    console.log(`${worker}: ${n} rows`);
  });

  if (excessiveProcessedRowsCount > 0) {
    throw new Error('Excessive processed rows');
  }
});
