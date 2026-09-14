import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { Env } from './env';
import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';

@Injectable()
export class RedisDb {
  public readonly client: ReturnType<typeof createClient>;

  constructor(config: ConfigService<Env, true>) {
    this.client = createClient({ url: config.get('REDIS_URL') });
    this.connect();
  }

  private async connect() {
    await this.client.connect();
  }
}

@Injectable()
export class PostgresPool {
  public readonly pool: Pool;

  constructor(config: ConfigService<Env, true>) {
    this.pool = new Pool({
      connectionString: config.get('DB_URL')!,
      max: 3
    });

    this.pool.on('error', (err) => {
      console.error('PG pool error', err.message);
    });
  }
}
