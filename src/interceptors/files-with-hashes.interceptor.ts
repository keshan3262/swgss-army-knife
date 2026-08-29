import { CallHandler, ExecutionContext, mixin, NestInterceptor, Type } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import type { Request, Response } from 'express';
import 'multer';
import { createHash } from 'node:crypto';
import { Observable } from 'rxjs';

type MulterFile = Express.Multer.File;

const getFilesHashes = (files: MulterFile[]) =>
  files.map(file => createHash('sha256').update(file.buffer).digest('hex'));

export function FilesWithHashesInterceptor(
  fieldName: string,
  maxCount?: number,
  localOptions?: MulterOptions
): Type<NestInterceptor> {
  class MixinInterceptor implements NestInterceptor {
    protected filesInterceptor: NestInterceptor;

    constructor() {
      const LocalInterceptor = FilesInterceptor(fieldName, maxCount, localOptions);
      this.filesInterceptor = new LocalInterceptor();
    }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
      return this.filesInterceptor.intercept(
        context,
        {
          handle: () => {
            const ctx = context.switchToHttp();
            const request = ctx.getRequest<Request & { files?: MulterFile[] | Record<string, MulterFile[]> }>();
            const response = ctx.getResponse<Response>();
            const files = request.files;

            // TODO: Add worker threads to calculate hashes in parallel
            if (Array.isArray(files)) {
              response.locals.filesHashes = getFilesHashes(files);
            } else if (files) {
              response.locals.filesHashes = Object.fromEntries(
                Object.entries(files).map(([key, files]) => [key, getFilesHashes(files)])
              );
            }

            return next.handle();
          }
        }
      );
    }
  }

  const interceptor = mixin(MixinInterceptor);

  return interceptor;
}
