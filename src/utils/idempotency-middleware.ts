import { createHash } from 'node:crypto';

import { claimTmpKey, finishTmpKey, getPlainValue } from './key-value-store';
import { IdempotencyConflictException, IdempotencyKeyReuseException } from './errors';
import { withAsyncException } from './with-async-exception';

const TTL_SECONDS = 24 * 60 * 60;

interface IdempotencyRecordBase {
  state: 'in-flight' | 'finished';
  fingerprint: string;
}

interface IdempotencyRecordInFlight extends IdempotencyRecordBase {
  state: 'in-flight';
}

interface IdempotencyRecordFinished extends IdempotencyRecordBase {
  state: 'finished';
  statusCode: number;
  body: any;
}

type IdempotencyRecord = IdempotencyRecordInFlight | IdempotencyRecordFinished;

export const idempotencyBeforeHandlerMiddleware = withAsyncException(async (req, res, next) => {
  if (req.method !== 'POST') {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
  if (!idempotencyKey) {
    console.warn('No idempotency key provided, openexpress-api-validator should have rejected the request');

    return next();
  }

  const filesFingerprintInput = res.locals.filesHashes ?? [];

  const fingerprint = createHash('sha256')
    .update(req.url)
    .update('\n' + JSON.stringify(filesFingerprintInput) + '\n')
    .update(JSON.stringify(req.body ?? null))
    .digest('hex');
  const claimed = await claimTmpKey(`idem:${idempotencyKey}`, { state: 'in-flight', fingerprint }, TTL_SECONDS);

  if (claimed) {
    const originalResJson = res.json;
    res.json = (body?: any) => {
      finishTmpKey(
        `idem:${idempotencyKey}`,
        { state: 'finished', fingerprint, statusCode: res.statusCode, body },
        TTL_SECONDS
      ).catch(console.error);

      return originalResJson.call(res, body);
    }

    return next();
  }

  const idempotencyRecord: IdempotencyRecord | null = await getPlainValue(`idem:${idempotencyKey}`);

  if (!idempotencyRecord) {
    return next();
  }

  if (idempotencyRecord.fingerprint !== fingerprint) {
    throw new IdempotencyKeyReuseException();
  }

  if (idempotencyRecord.state === 'in-flight') {
    throw new IdempotencyConflictException();
  }

  res.header('Idempotency-Replay', 'true');
  res.status(idempotencyRecord.statusCode).json(idempotencyRecord.body);
});
