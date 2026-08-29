import { BadRequestException } from '@nestjs/common';

export class BadRequestErrorWithBody extends BadRequestException {
  constructor(errors: Array<{ in: string; message: string }>, detail = 'The request is invalid') {
    super({ detail, errors });
  }
}
