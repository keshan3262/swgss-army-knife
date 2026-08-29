import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { createApp } from './create-app';
import { Env } from './utils/env';

async function bootstrap() {
  const app = await createApp();
  process.on('SIGTERM', () => console.log('SIGTERM received'));

  const config = app.get(ConfigService<Env, true>);
  const port = config.get('PORT', { infer: true });
  await app.listen(port);
  console.log(`Server is running on port ${port}`);
}

bootstrap();
