import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PostgresPool, RedisDb } from '../utils/dbs';

const startTime = Date.now();

@Controller('health')
@ApiExcludeController(true)
export class HealthController {
  constructor(private readonly redis: RedisDb, private readonly pg: PostgresPool) {}

  @Get()
  async health() {
    try {
      await Promise.all([this.redis.client.ping(), this.pg.pool.query('SELECT 1')]);

      return { status: 'ok', uptime: Date.now() - startTime };
    } catch (error) {
      console.error('Health check failed', error);
      throw error;
    }
  }
}
