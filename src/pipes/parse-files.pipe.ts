import {
  ArgumentMetadata,
  FileTypeValidator,
  HttpStatus,
  Injectable,
  Optional,
  ParseFilePipe,
  PipeTransform,
  UnsupportedMediaTypeException
} from '@nestjs/common';
import { ErrorHttpStatusCode, HttpErrorByCode } from '@nestjs/common/utils/http-error-by-code.util';

export interface ParseFilesPipeOptions {
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (error: unknown) => any;
  minCount?: number;
  maxCount?: number;
  fileType?: string | RegExp;
}

@Injectable()
export class ParseFilesPipe implements PipeTransform {
  private readonly parseFilePipe?: ParseFilePipe;
  protected exceptionFactory: (error: unknown) => any;

  constructor(@Optional() protected readonly options?: ParseFilesPipeOptions) {
    const { exceptionFactory, errorHttpStatusCode = HttpStatus.BAD_REQUEST, fileType } = options ?? {};

    this.exceptionFactory =
      exceptionFactory ||
      (error => new HttpErrorByCode[errorHttpStatusCode](error));

    if (fileType) {
      this.parseFilePipe = new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new FileTypeValidator({
            fileType,
            fallbackToMimetype: true
          })
        ],
        exceptionFactory: error =>
          new UnsupportedMediaTypeException({
            errors: [{ field: 'images', rules: [error] }]
          })
      });
    }
  }

  async transform(value: Express.Multer.File[] | undefined, metadata: ArgumentMetadata) {
    const files = value ?? [];
    const { minCount = 1, maxCount = Infinity } = this.options ?? {};
    const field = metadata.data ?? 'images';

    if (files.length < minCount || files.length > maxCount) {
      const message = Number.isFinite(maxCount)
        ? `Must upload between ${minCount} and ${maxCount} files`
        : `Must upload at least ${minCount} files`;

      throw this.exceptionFactory({
        errors: [{ field, rules: [message] }]
      });
    }

    if (this.parseFilePipe) {
      return this.parseFilePipe.transform(files);
    }

    return files;
  }
}
