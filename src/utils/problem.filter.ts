import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { defaultTitleByStatus } from './problem';
import { Env } from './env';

@Catch()
export class ProblemFilter implements ExceptionFilter {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const baseUrl = this.configService.get('BASE_URL');
    const res = host.switchToHttp().getResponse<Response>();
    const req = host.switchToHttp().getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
    const detail =
      (b.detail as string) ??
      (typeof body === 'string' ? body : (b.message as string) ?? 'Unexpected error');
    res.status(status).type('application/problem+json').json({
      type: `${baseUrl}/problems/${(b.code as string) ?? status}`,
      title: defaultTitleByStatus[status] ?? 'Error',
      status,
      detail,
      instance: req.originalUrl,
      ...(b.errors ? { errors: b.errors } : {}),
    });
  }
}