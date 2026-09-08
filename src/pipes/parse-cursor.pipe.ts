import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { BadRequestErrorWithBody } from '../utils/bad-request-error-with-body';

export interface ParseCursorResult {
  startId: number;
}

@Injectable()
export class ParseCursorPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): ParseCursorResult {
    let startId: number;
    try {
      startId = value ? parseInt(atob(String(value))) : 0;
  
      if (startId < 0 || isNaN(startId)) {
        throw new Error('Invalid cursor');
      }
    } catch {
      throw new BadRequestErrorWithBody([{ field: metadata.data ?? metadata.type, rules: ['Invalid cursor'] }]);
    }

    return { startId };
  }
}
