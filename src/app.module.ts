import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validate } from './utils/env';
import { ConversionsController } from './controllers/conversions.controller';
import { HealthController } from './controllers/health.controller';
import { UsersController } from './controllers/users.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: ['.env', '../.env'],
    }),
  ],
  controllers: [HealthController, UsersController, ConversionsController]
})
export class AppModule {}
