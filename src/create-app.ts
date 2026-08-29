import { NestFactory } from '@nestjs/core';
import { BadRequestException, type NestApplicationOptions, ValidationError, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Env } from './utils/env';
import { ProblemFilter } from './utils/problem.filter';
import { IdempotencyInterceptor } from './interceptors/idempotency.interceptor';
import { RedisDb } from './utils/dbs';

function validationFactory(errors: ValidationError[]) {
  return new BadRequestException({
    code: 'validation-failed',
    detail: 'The request is invalid',
    errors: errors.map((e) => ({
      field: e.property,
      rules: Object.values(e.constraints ?? {}),
    })),
  });
}

export async function createApp(options?: NestApplicationOptions) {
  const app = await NestFactory.create(AppModule, options);
  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env, true>);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, exceptionFactory: validationFactory }));
  app.useGlobalFilters(new ProblemFilter(config));
  app.useGlobalInterceptors(new IdempotencyInterceptor(app.get(RedisDb)));
  const openapiConfig = new DocumentBuilder()
    .setTitle('swgss-army-knife')
    .setDescription('Image conversion and compression API')
    .setVersion('1.0.0')
    .addServer(`http://localhost:${config.get('PORT', { infer: true })}`, 'Local development server')
    .addSecurityRequirements({})
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, openapiConfig);
  SwaggerModule.setup('api', app, documentFactory, {
    jsonDocumentUrl: 'api/openapi.json',
    yamlDocumentUrl: 'api/openapi.yaml'
  });

  return app;
}
