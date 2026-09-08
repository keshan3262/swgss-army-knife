import { Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validate } from './utils/env';
import { ConversionsController } from './controllers/conversions.controller';
import { HealthController } from './controllers/health.controller';
import { UsersController } from './controllers/users.controller';
import { PostgresPool, RedisDb } from './utils/dbs';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: ['.env', '../.env'],
    }),
  ],
  controllers: [HealthController, UsersController, ConversionsController],
  providers: [RedisDb, PostgresPool],
})
export class AppModule implements OnApplicationShutdown {
  constructor(
    private readonly redisDb: RedisDb,
    private readonly postgresPool: PostgresPool,
  ) {}

  async onApplicationShutdown() {
    await Promise.all([
      this.redisDb.client.isOpen ? this.redisDb.client.close() : undefined,
      this.postgresPool.pool.end(),
    ]);
  }
}
