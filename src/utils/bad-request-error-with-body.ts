import { BadRequestException } from '@nestjs/common';

export class BadRequestErrorWithBody extends BadRequestException {
  constructor(errors: Array<{ field: string; rules: string[] }>, detail = 'The request is invalid') {
    super({ detail, errors });
  }
}
