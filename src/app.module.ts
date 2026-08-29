import { Module } from '@nestjs/common';
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
  providers: [RedisDb, PostgresPool]
})
export class AppModule {}
