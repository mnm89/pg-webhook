import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CreateHookDto } from './webhooks.dto';

import initWebhooks from './bootstrap';
import { ConfigService } from '@nestjs/config';
type Hook = {
  id: number;
  schema_name: string;
  table_name: string;
  event_name: 'INSERT' | 'UPDATE' | 'DELETE';
  url: string;
  secret: string;
  active: boolean;
  created_at: string;
};
@Injectable()
export class WebhooksService implements OnModuleInit {
  @Inject()
  private readonly db: DbService;
  @Inject()
  private readonly config: ConfigService;
  async onModuleInit() {
    await initWebhooks(this.config, this.db);
  }

  async create(dto: CreateHookDto) {
    const query = `
      INSERT INTO webhook.hooks (table_name, event_name, url, secret)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const rows = await this.db.query<Hook>(query, [
      dto.tableName,
      dto.eventName,
      dto.url,
      dto.secret,
    ]);
    return rows[0];
  }
  async findAll() {
    const rows = await this.db.query<Hook>(
      `SELECT * FROM webhook.hooks WHERE active = true ORDER BY created_at DESC;`,
    );
    return rows;
  }
  async remove(id: number) {
    await this.db.query(`DELETE FROM webhook.hooks WHERE id = $1;`, [id]);
    return { success: true };
  }

  async findByTableAndEvent(schema: string, table: string, event: string) {
    const rows = await this.db.query<Hook>(
      `SELECT * FROM webhook.hooks WHERE schema_name = $1 AND table_name = $2 AND event_name = $3 AND active = true;`,
      [schema, table, event],
    );
    return rows;
  }
}
