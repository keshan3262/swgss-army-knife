import { randomUUID } from 'node:crypto';
import { MoreThanOrEqual, type QueryRunner } from 'typeorm';
import { ImageFormat } from '../entities/enums';
import { withDataSourceInitialization } from '../with-data-source-initialization';
import type { dataSource } from '../data-source';
import { User } from '../entities/user';
import { ConversionHandler } from '../entities/conversion-handler';
import { clearDb } from '../clear-db';
import { seed } from '../seed-fn';

const ATTEMPTS = 50;
const IMAGES_PER_CONVERSION = 3;

type CounterTable = 'users' | 'conversion_handlers';

type HandlersImageFormat = ImageFormat.PNG | ImageFormat.SVG;

type SupportedHandler = ConversionHandler & {
  format: HandlersImageFormat;
};

type Attempt = {
  number: number;
  userId: string;
  handlerId: string;
  format: HandlersImageFormat;
};

async function decrement(runner: QueryRunner, table: CounterTable, id: string, n: number) {
  const [rows]: [{ id: string }[], number] = await runner.query(
    `UPDATE ${table} SET pts_left = pts_left - $2 WHERE id = $1 AND pts_left >= $2 RETURNING id`,
    [id, n]
  );

  return rows.length === 1;
}

async function runAttempt(ds: typeof dataSource, attempt: Attempt, runId: string): Promise<boolean> {
  const runner = ds.createQueryRunner();

  try {
    await runner.connect();
    await runner.startTransaction();

    if (!await decrement(runner, 'users', attempt.userId, IMAGES_PER_CONVERSION)) {
      await runner.rollbackTransaction();
      return false;
    }

    if (!await decrement(runner, 'conversion_handlers', attempt.handlerId, IMAGES_PER_CONVERSION)) {
      // This also restores the successful user decrement.
      await runner.rollbackTransaction();
      return false;
    }

    const conversions: { id: string }[] = await runner.query(
      `INSERT INTO conversions (user_id, destination_format, status) VALUES ($1, $2, 'pending') RETURNING id`,
      [attempt.userId, attempt.format]
    );

    const valuesTemplate = Array.from(
      { length: IMAGES_PER_CONVERSION },
      (_, i) => '(' + Array.from({ length: 5 }, (_, j) => i * 5 + j + 1).map(k => `$${k}`).join(', ') + ')'
    ).join(', ');
    await runner.query(
      `INSERT INTO source_images (conversion_id, format, original_name, size, storage_url) VALUES ${valuesTemplate}`,
      Array.from({ length: IMAGES_PER_CONVERSION }, (_, i) => i).flatMap(
        i => [
          conversions[0].id,
          attempt.format,
          `race-${attempt.number}-${i}.${attempt.format}`,
          1024,
          `https://example.com/race/${runId}/${attempt.number}-${i}.${attempt.format}`
        ]
      )
    );

    await runner.commitTransaction();
    return true;
  } catch {
    if (runner.isTransactionActive) {
      await runner.rollbackTransaction();
    }
    return false;
  } finally {
    if (!runner.isReleased) {
      await runner.release();
    }
  }
}

function supportedFormat(handler: ConversionHandler) {
  return ([ImageFormat.PNG, ImageFormat.SVG] as const).find(
    (format) =>
      handler.sourceFormats.includes(format) &&
      handler.destinationFormats.includes(format)
  );
}

function distributeUsers(users: User[]) {
  const remaining = new Map(users.map((user) => [user.id, user.ptsLeft]));
  const userIds: string[] = [];

  while (userIds.length < ATTEMPTS) {
    for (const user of users) {
      const points = remaining.get(user.id) ?? 0;
      if (points >= 1) {
        userIds.push(user.id);
        remaining.set(user.id, points - 1);
      }

      if (userIds.length === ATTEMPTS) {
        return userIds;
      }
    }
  }

  return userIds;
}

function createAttempts(users: User[], handlers: SupportedHandler[]) {
  const userIds = distributeUsers(users);

  return Array.from({ length: ATTEMPTS }, (_, index) => {
    const handler = handlers[index % handlers.length];

    return {
      number: index + 1,
      userId: userIds[index],
      handlerId: handler.id,
      format: handler.format
    };
  });
}

withDataSourceInitialization(async (ds) => {
  await clearDb(ds);
  await seed(ds, false);
  await ds.createQueryBuilder(User, 'user').update().set({ ptsLeft: 30 }).execute();
  await ds.createQueryBuilder(ConversionHandler, 'ch').update().set({ ptsLeft: 30 }).execute();
  const users = await ds.getRepository(User).find({ where: { ptsLeft: MoreThanOrEqual(1) }, order: { id: 'ASC' } });
  const allHandlers = await ds.getRepository(ConversionHandler).find({ order: { id: 'ASC' } });
  const handlers = allHandlers
    .map((handler) => ({ ...handler, format: supportedFormat(handler) }))
    .filter((handler): handler is SupportedHandler => handler.format !== undefined);

  const attempts = createAttempts(users, handlers);
  const runId = randomUUID();
  const results = await Promise.all(attempts.map((attempt) => runAttempt(ds, attempt, runId)));
  const successful = results.filter(Boolean).length;
  const finalHandlers = await ds.getRepository(ConversionHandler).find({ order: { id: 'ASC' } });
  const negativeHandlers = finalHandlers.filter((handler) => handler.ptsLeft < 0);

  console.log(`Total attempts: ${ATTEMPTS}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${ATTEMPTS - successful}`);
  console.log('Final conversion-handler points:');
  for (const handler of finalHandlers) {
    console.log(`  ${handler.name} (id=${handler.id}): ${handler.ptsLeft}`);
  }
  console.log(`Handlers with negative pts_left: ${negativeHandlers.length}`);

  if (negativeHandlers.length > 0) {
    throw new Error('Handlers with negative pts_left');
  }
});
