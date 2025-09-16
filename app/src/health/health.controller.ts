import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { PostgresHealthIndicator } from './health.indicator';

@Controller('health')
export class HealthController {
  @Inject()
  private readonly health: HealthCheckService;
  @Inject()
  private memory: MemoryHealthIndicator;
  @Inject()
  private pg: PostgresHealthIndicator;

  @Get()
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
      () => this.pg.isHealthy('postgres'),
    ]);
  }
  @Get('live')
  @HealthCheck()
  liveness() {
    return { status: 'up' };
  }
}
