import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UnprocessableEntityException
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { from, mergeMap, Observable, of } from 'rxjs';
import { RedisDb } from '../utils/dbs';
import { BadRequestErrorWithBody } from '../utils/bad-request-error-with-body';

const TTL_SECONDS = 24 * 60 * 60;

interface IdemRecord {
  state: 'in-flight' | 'done';
  fingerprint: string;
  status?: number;
  body?: unknown;
}

class RedisStore {
  constructor(private readonly redis: RedisDb) {}

  async claim(key: string, rec: IdemRecord) {
    // SET NX — атомарний «хто перший»: конкурентний повтор програє чесно
    const res = await this.redis.client.set(`idem:${key}`, JSON.stringify(rec), {
      NX: true,
      EX: TTL_SECONDS,
    });
    return res === 'OK';
  }
  async finish(key: string, rec: IdemRecord) {
    await this.redis.client.set(`idem:${key}`, JSON.stringify(rec), { EX: TTL_SECONDS });
  }
  async get(key: string) {
    const raw = await this.redis.client.get(`idem:${key}`);
    return raw ? (JSON.parse(raw) as IdemRecord) : null;
  }
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly store: RedisStore;

  constructor(redisDb: RedisDb) {
    this.store = new RedisStore(redisDb);
  }

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    if (req.method !== 'POST') return next.handle();

    const key = req.header('idempotency-key');
    if (!key) {
      throw new BadRequestErrorWithBody([{ field: 'idempotency-key', rules: ['Idempotency-Key header is required'] }]);
    }

    return from(this.handle(key, req, res, next)).pipe(mergeMap((obs) => obs));
  }

  private async handle(
    key: string,
    req: Request,
    res: Response,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const filesFingerprintInput: string[] | Record<string, string[]> = res.locals.filesHashes ?? [];
    const fingerprint = createHash('sha256')
      .update(req.url)
      .update('\n' + JSON.stringify(filesFingerprintInput) + '\n')
      .update(JSON.stringify(req.body ?? null))
      .digest('hex');

    const claimed = await this.store.claim(key, { state: 'in-flight', fingerprint });

    if (claimed) {
      return next.handle().pipe(
        mergeMap(async (body) => {
          await this.store.finish(key, { state: 'done', fingerprint, status: 201, body });
          return body;
        }),
      );
    }

    const rec = await this.store.get(key);
    if (!rec) return next.handle();

    if (rec.fingerprint !== fingerprint) {
      throw new UnprocessableEntityException({
        code: 'idempotency-key-reuse',
        detail: 'This Idempotency-Key has been used with a different request body',
      });
    }

    if (rec.state === 'in-flight') {
      throw new ConflictException({
        code: 'idempotency-in-flight',
        detail: 'Request with this key is still being processed - try again later',
      });
    }

    res.setHeader('Idempotency-Replay', 'true');

    return of(rec.body);
  }
}
