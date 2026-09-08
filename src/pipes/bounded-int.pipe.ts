import {
  ArgumentMetadata,
  HttpStatus,
  Injectable,
  Optional,
  ParseIntPipe,
  PipeTransform
} from '@nestjs/common';
import { ErrorHttpStatusCode, HttpErrorByCode } from '@nestjs/common/utils/http-error-by-code.util';
import { BadRequestErrorWithBody } from '../utils/bad-request-error-with-body';

export interface ParseBoundedIntPipeOptions {
  errorHttpStatusCode?: ErrorHttpStatusCode;
  exceptionFactory?: (error: unknown) => any;
  optional?: boolean;
  min?: number;
  max?: number;
}

@Injectable()
export class ParseBoundedIntPipe implements PipeTransform {
  private readonly parseIntPipe: ParseIntPipe;
  protected exceptionFactory: (error: { field: string; rules: string[] }) => any;

  constructor(@Optional() protected readonly options?: ParseBoundedIntPipeOptions) {
    this.parseIntPipe = new ParseIntPipe(options);
    const { exceptionFactory, errorHttpStatusCode = HttpStatus.BAD_REQUEST } = options ?? {};

    if (exceptionFactory) {
      this.exceptionFactory = exceptionFactory;
    } else if (errorHttpStatusCode === HttpStatus.BAD_REQUEST) {
      this.exceptionFactory = (error) => new BadRequestErrorWithBody([error]);
    } else {
      this.exceptionFactory = (error) => new HttpErrorByCode[errorHttpStatusCode](error);
    }
  }

  async transform(value: unknown, metadata: ArgumentMetadata): Promise<number> {
    const { min = -Infinity, max = Infinity } = this.options ?? {};
    try {
      const parsedValue = await this.parseIntPipe.transform(value as string, metadata);

      if (parsedValue < min) {
        throw new Error(`Value must be not less than ${min}`);
      }

      if (parsedValue > max) {
        throw new Error(`Value must be not greater than ${max}`);
      }

      return parsedValue;
    } catch {
      throw this.exceptionFactory({
        field: metadata.data ?? metadata.type,
        rules: [`Value must be a integer within the interval [${min}, ${max}]`]
      });
    }
  }
}
