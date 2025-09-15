/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Inject, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CreateHookDto } from './webhooks.dto';

@Injectable()
export class WebhooksService {
  @Inject()
  private readonly db: DbService;

  async create(dto: CreateHookDto) {
    const query = `
      INSERT INTO webhooks (table_name, event_name, url, secret)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const rows = await this.db.query(query, [
      dto.tableName,
      dto.eventName,
      dto.url,
      dto.secret,
    ]);
    return rows[0];
  }
  async findAll() {
    const rows = await this.db.query(
      `SELECT * FROM webhooks WHERE active = true ORDER BY created_at DESC;`,
    );
    return rows;
  }
  async remove(id: number) {
    await this.db.query(`DELETE FROM webhooks WHERE id = $1;`, [id]);
    return { success: true };
  }

  async findByTableAndEvent(table: string, event: string) {
    const rows = await this.db.query(
      `SELECT * FROM webhooks WHERE table_name = $1 AND event_name = $2 AND active = true;`,
      [table, event],
    );
    return rows;
  }
}
