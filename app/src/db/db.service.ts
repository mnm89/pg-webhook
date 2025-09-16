/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DbService {
  private _pool?: Pool;
  @Inject()
  private readonly configService: ConfigService;
  private readonly logger = new Logger(DbService.name);
  private get pool(): Pool {
    if (!this._pool) {
      const dbUrl = this.configService.get<string>('DATABASE_URL');
      this._pool = new Pool({ connectionString: dbUrl, logger: this.logger });
    }
    return this._pool;
  }

  async query<T = any, R = T>(
    sql: string,
    params?: any[],
    parser?: (row: T) => R,
  ): Promise<R[]> {
    const client = await this.pool.connect();
    try {
      const res = await client.query<T>(sql, params);
      if (parser) {
        return res.rows.map(parser);
      }
      return res.rows;
    } finally {
      client.release();
    }
  }
}
