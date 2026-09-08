import { Body, Controller, Get, Post, Query, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiProperty,
  ApiQuery,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  ApiUnsupportedMediaTypeResponse
} from '@nestjs/swagger';
import type { Response } from 'express';
import { FilesWithHashesInterceptor } from '../interceptors/files-with-hashes.interceptor';
import { makeProblemResponseOptions, ProblemDto } from '../utils/problem';
import { makeItemsPage } from '../utils/make-items-page';
import { ParseBoundedIntPipe } from '../pipes/bounded-int.pipe';
import { ParseCursorPipe, type ParseCursorResult } from '../pipes/parse-cursor.pipe';
import { ParseFilesPipe } from '../pipes/parse-files.pipe';
import { IsArray, IsEnum, IsInt, IsString, IsUrl, Matches, Min, ValidateIf } from 'class-validator';

type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'avif' | 'svg';

const IMAGE_FORMATS = ['svg', 'jpeg', 'png', 'webp', 'gif', 'avif'] as const;

const imgFormatAliasToFormat: Record<string, ImageFormat> = {
  jpg: 'jpeg',
  jpe: 'jpeg',
  jfif: 'jpeg',
  pjpeg: 'jpeg',
  pjp: 'jpeg'
};

class ConvertedVersionDto {
  @ApiProperty({
    pattern: String.raw`^[a-fA-F0-9]{64}\.(jpeg|png|webp|gif|avif|svg)$`,
    description: 'SHA-256 hex digest of the original file followed by the file extension'
  })
  @Matches(String.raw`^[a-fA-F0-9]{64}\.(jpeg|png|webp|gif|avif|svg)$`)
  hashedOriginal!: string;

  @ApiProperty({
    format: 'uri',
    nullable: true,
    required: false,
    description: 'URL of the converted image'
  })
  @IsUrl()
  url?: string | null;
}

class ConversionDto {
  @ApiProperty({ example: 1, type: 'integer', minimum: 1, format: 'int64' })
  @IsInt()
  @Min(1)
  id!: number;

  @ApiProperty({ example: 1, type: 'integer', minimum: 1, format: 'int64' })
  @IsInt()
  @Min(1)
  userId!: number;

  @ApiProperty({ enum: IMAGE_FORMATS, enumName: 'ImageFormat' })
  @IsEnum(IMAGE_FORMATS)
  destinationFormat!: ImageFormat;

  @ApiProperty({ type: [ConvertedVersionDto] })
  @IsArray()
  versions!: ConvertedVersionDto[];

  @ApiProperty({ enum: ['pending', 'completed', 'failed'] })
  @IsEnum(['pending', 'completed', 'failed'])
  status!: 'pending' | 'completed' | 'failed';
}

const dummyConversions: ConversionDto[] = [
  {
    id: 1,
    userId: 1,
    destinationFormat: 'png',
    status: 'completed',
    versions: [
      {
        hashedOriginal: '3db1ce837b8b236b23f6583901b655102f4db6db736fa83906c73c782c366e8e.jpeg',
        url: 'https://somecdn.com/3db1ce837b8b236b23f6583901b655102f4db6db736fa83906c73c782c366e8e.png'
      },
      {
        hashedOriginal: 'e8403f70c9e648604d54e84b7bb361b5e157aa52d2d5a2a08c3d809be4b2166e.jpeg',
        url: 'https://somecdn.com/e8403f70c9e648604d54e84b7bb361b5e157aa52d2d5a2a08c3d809be4b2166e.png'
      }
    ]
  },
  {
    id: 2,
    userId: 1,
    destinationFormat: 'png',
    status: 'completed',
    versions: [
      {
        hashedOriginal: 'c64d6e664b29c417536a5bed554ae09db8d2a39d429caae0f413ffbf48711c3b.jpeg',
        url: 'https://somecdn.com/c64d6e664b29c417536a5bed554ae09db8d2a39d429caae0f413ffbf48711c3b.png'
      }
    ]
  },
  {
    id: 3,
    userId: 2,
    destinationFormat: 'webp',
    status: 'pending',
    versions: [
      {
        hashedOriginal: 'c56e3251b4cbb2d43ca6c2cb538b302d7ba0d93944fe2b19a88f82e1d0b24bba.jpeg',
        url: 'https://somecdn.com/c56e3251b4cbb2d43ca6c2cb538b302d7ba0d93944fe2b19a88f82e1d0b24bba.webp'
      },
      {
        hashedOriginal: '905cf0f01005865823cac0fa66352e119f78fad5abd358ccf92dc988e9e3571f.jpeg',
      }
    ]
  },
  {
    id: 4,
    userId: 2,
    destinationFormat: 'avif',
    status: 'completed',
    versions: [
      {
        hashedOriginal: 'a11942801b399aefb7a87ed26a3817504f0577ef64385aafc5e242b9f5750f18.jpeg',
        url: 'https://somecdn.com/a11942801b399aefb7a87ed26a3817504f0577ef64385aafc5e242b9f5750f18.avif'
      },
      {
        hashedOriginal: '229a4917b7c1fb3792b21a18e2999245b33812ddee7434be9455b91c097de1ed.jpeg',
        url: 'https://somecdn.com/229a4917b7c1fb3792b21a18e2999245b33812ddee7434be9455b91c097de1ed.avif'
      }
    ]
  },
  {
    id: 5,
    userId: 3,
    destinationFormat: 'webp',
    status: 'failed',
    versions: [
      {
        hashedOriginal: '9cc2f1c0f7179aa27f2d5aa6b0448fe71254618d027a970fb7528db5df44924c.png',
      }
    ]
  },
  {
    id: 6,
    userId: 3,
    destinationFormat: 'webp',
    status: 'completed',
    versions: [
      {
        hashedOriginal: '323e0bf0d52e1029d9e5f03b5e66cb8b246b64e35a258eea95884ab944fd38d6.png',
        url: 'https://somecdn.com/323e0bf0d52e1029d9e5f03b5e66cb8b246b64e35a258eea95884ab944fd38d6.webp'
      }
    ]
  }
];

let nextConversionId = dummyConversions.length + 1;

class ConversionsListDto {
  @ApiProperty({ type: [ConversionDto] })
  @IsArray()
  items!: ConversionDto[];

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'The cursor to start from. This is an opaque token'
  })
  @IsString()
  @ValidateIf((_, value) => value !== null)
  next_cursor!: string | null;
}

class StartConversionDto {
  @ApiProperty({ enum: IMAGE_FORMATS, enumName: 'ImageFormat' })
  @IsEnum(IMAGE_FORMATS)
  format!: ImageFormat;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    minItems: 1,
    maxItems: 10
  })
  images!: unknown;
}

const createConversion = async (
  conversion: StartConversionDto,
  userId: number,
  filesHashes: string[],
  filesNames: string[]
) => {
  const { format } = conversion;
  const newConversion: ConversionDto = {
    userId,
    destinationFormat: format,
    id: nextConversionId++,
    status: 'pending',
    versions: filesHashes.map((hash, index) => {
      const extension = filesNames[index].split('.').pop()!;

      return { hashedOriginal: `${hash}.${imgFormatAliasToFormat[extension] || extension}` };
    })
  };
  dummyConversions.push(newConversion);

  return newConversion;
};

@Controller('conversions')
@ApiExtraModels(ProblemDto)
export class ConversionsController {
  @Get()
  @ApiOperation({ summary: 'List image conversions', operationId: 'listConversions' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'The maximum number of conversions to return',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 }
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    schema: { type: 'string', nullable: true, description: 'The cursor to start from. This is an opaque token' }
  })
  @ApiOkResponse({ description: 'A list of image conversions', type: ConversionsListDto })
  @ApiBadRequestResponse(makeProblemResponseOptions('Bad request'))
  @ApiUnauthorizedResponse(makeProblemResponseOptions('Unauthorized'))
  @ApiInternalServerErrorResponse(makeProblemResponseOptions('Internal server error'))
  async listConversions(
    @Query('cursor', ParseCursorPipe) { startId }: ParseCursorResult,
    @Query('limit', new ParseBoundedIntPipe({ min: 1, max: 100, optional: true })) limit = 10
  ): Promise<ConversionsListDto> {
    return makeItemsPage(dummyConversions, limit, startId);
  }

  @Post('start')
  @UseInterceptors(FilesWithHashesInterceptor('images', 10, {
    limits: {
      fileSize: 1024 * 1024 * 7,
      files: 10,
      fields: 10,
      fieldSize: 1024
    }
  }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Start an image conversion', operationId: 'startConversion' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'A unique identifier for the request. If the request is retried, the same idempotency key should be used.',
    schema: { type: 'string', minLength: 1, maxLength: 255 }
  })
  @ApiBody({
    type: StartConversionDto,
    required: true,
    encoding: {
      images: {
        contentType: 'image/jpeg, image/png, image/webp, image/gif, image/avif, image/svg+xml'
      }
    }
  })
  @ApiCreatedResponse({ description: 'Conversion started', type: ConversionDto })
  @ApiBadRequestResponse(makeProblemResponseOptions('Bad request'))
  @ApiUnauthorizedResponse(makeProblemResponseOptions('Unauthorized'))
  @ApiConflictResponse(makeProblemResponseOptions('Conflict'))
  @ApiPayloadTooLargeResponse(makeProblemResponseOptions('Request entity too large'))
  @ApiUnsupportedMediaTypeResponse(makeProblemResponseOptions('Unsupported media type'))
  @ApiUnprocessableEntityResponse(makeProblemResponseOptions('Unprocessable entity'))
  @ApiTooManyRequestsResponse(makeProblemResponseOptions('Too many requests'))
  @ApiInternalServerErrorResponse(makeProblemResponseOptions('Internal server error'))
  async startConversion(
    @UploadedFiles(new ParseFilesPipe({
      minCount: 1,
      maxCount: 10,
      fileType: /^image\/(jpeg|png|webp|gif|avif|svg\+xml)$/
    })) files: Express.Multer.File[],
    @Body() body: StartConversionDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<ConversionDto> {
    console.log(`Received ${files.length} files, total size ${files.reduce((acc, file) => acc + file.size, 0)} bytes`);
    const rawFilesHashes: string[] | Record<string, string[]> | undefined = res.locals.filesHashes;
    console.log(rawFilesHashes);
    const filesHashes = Array.isArray(rawFilesHashes) ? rawFilesHashes : rawFilesHashes?.images ?? [];

    return await createConversion(body, 1, filesHashes, files.map(file => file.originalname));
  }
}
