import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { Env } from './env';
import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

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

const SECRET_FILE = path.join(__dirname, '..', '..', 'secrets', 'db_password');

@Injectable()
export class PostgresPool {
  public readonly pool: Pool;

  constructor(config: ConfigService<Env, true>) {
    this.pool = new Pool({
      host: config.get('PG_DB_HOST'),
      port: config.get('PG_DB_PORT', { infer: true }),
      user: 'app_user',
      database: 'swgss-army-knife',
      password: async () => (await readFile(SECRET_FILE, 'utf-8')).trim(),
      max: 3
    });

    this.pool.on('error', (err) => {
      console.error('PG pool error', err);
    });
  }
}
