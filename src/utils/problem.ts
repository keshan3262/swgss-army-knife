import { ApiProperty, getSchemaPath } from '@nestjs/swagger';

export class ProblemDto {
  @ApiProperty({ format: 'uri' })
  type!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ format: 'int32', minimum: 400, maximum: 599 })
  status!: number;

  @ApiProperty()
  detail!: string;

  @ApiProperty({ format: 'uri' })
  instance!: string;

  @ApiProperty({ type: [Object], required: false })
  errors?: object[];
}

export const makeProblemResponseOptions = (description: string) => ({
  description,
  content: {
    'application/problem+json': { schema: { $ref: getSchemaPath(ProblemDto) } },
  },
});

export const defaultTitleByStatus: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  413: 'Request Entity Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error'
};
