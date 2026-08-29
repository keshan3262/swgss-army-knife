import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller('health')
@ApiExcludeController(true)
export class HealthController {
  @Get()
  health() {
    return { status: 'ok' };
  }
}
