import {
  HealthIndicatorService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { DbService } from '../db/db.service';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class PostgresHealthIndicator {
  @Inject()
  private readonly db: DbService;
  @Inject()
  private readonly health: HealthIndicatorService;

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      await this.db.query('SELECT 1');
      return indicator.up();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      return indicator.down({ message: err.message });
    }
  }
}
