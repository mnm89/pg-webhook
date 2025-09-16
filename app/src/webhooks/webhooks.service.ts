import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { CreateHookDto, UpdateHookDto } from './webhooks.dto';
import initWebhooks from './bootstrap';
import { ConfigService } from '@nestjs/config';

interface FindAllOptions {
  limit: number;
  offset: number;
  schemaName?: string;
  tableName?: string;
}

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
    await this.validateSchemaNameAndTableName(dto.schemaName, dto.tableName);
    const query = `
      INSERT INTO webhook.hooks (table_name, event_name, url, secret)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    try {
      const rows = await this.db.query<Hook>(query, [
        dto.tableName,
        dto.eventName,
        dto.url,
        dto.secret,
      ]);
      return rows[0];
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (err.code === '23505')
        throw new ConflictException(
          `Webhook already exists for ${dto.schemaName}.${dto.tableName} (${dto.eventName}) → ${dto.url}`,
        );

      throw err;
    }
  }

  async findOne(id: number) {
    const result = await this.db.query<Hook>(
      `SELECT * FROM webhook.hooks WHERE id = $1`,
      [id],
    );
    if (result.length === 0)
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    return result[0];
  }
  async remove(id: number) {
    const result = await this.db.query<Hook>(
      `DELETE FROM webhook.hooks WHERE id = $1 RETURNING *;`,
      [id],
    );
    if (result.length === 0)
      throw new NotFoundException(`Webhook with ID ${id} not found`);
    return result[0];
  }

  async update(id: number, dto: UpdateHookDto) {
    const hook = await this.findOne(id);
    await this.validateSchemaNameAndTableName(
      dto.schemaName || hook.schema_name,
      dto.tableName || hook.table_name,
    );
    try {
      const result = await this.db.query<Hook>(
        `
      UPDATE webhook.hooks
      SET schema_name = COALESCE($1, schema_name),
          table_name  = COALESCE($2, table_name),
          event_name  = COALESCE($3, event_name),
          url         = COALESCE($4, url),
          secret      = COALESCE($5, secret),
          active      = true
      WHERE id = $6
      RETURNING *;
      `,
        [dto.schemaName, dto.tableName, dto.eventName, dto.url, dto.secret, id],
      );
      return result[0];
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (err.code === '23505')
        throw new ConflictException(
          `Webhook already exists for ${dto.schemaName || hook.schema_name}.${dto.tableName || hook.table_name} (${dto.eventName || hook.event_name}) → ${dto.url || hook.url}`,
        );

      throw err;
    }
  }

  async findAll(opts: FindAllOptions) {
    const { limit, offset, schemaName, tableName } = opts;

    const conditions: string[] = [];
    const params: any[] = [];

    if (schemaName) {
      params.push(schemaName);
      conditions.push(`schema_name = $${params.length}`);
    }

    if (tableName) {
      params.push(tableName);
      conditions.push(`table_name = $${params.length}`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // 1. Count total rows
    const totalResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::int as count FROM webhook.hooks ${whereClause}`,
      params,
    );
    const total = totalResult[0]?.count ?? 0;

    params.push(limit);
    params.push(offset);
    const data = await this.db.query<Hook>(
      `
      SELECT *
      FROM webhook.hooks
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params,
    );
    return {
      data,
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }

  async findByTableAndEvent(schema: string, table: string, event: string) {
    const rows = await this.db.query<Hook>(
      `SELECT * FROM webhook.hooks WHERE schema_name = $1 AND table_name = $2 AND event_name = $3 AND active = true;`,
      [schema, table, event],
    );
    return rows;
  }

  private async validateSchemaNameAndTableName(schema: string, table: string) {
    const schemaNames = this.config.get<string[]>('SCHEMA_NAMES')!;

    if (!schemaNames.includes(schema)) {
      throw new BadRequestException(`Schema ${schema} is not allowed.`);
    }
    const tables = await this.db.query<{
      table_schema: string;
      table_name: string;
    }>(
      `SELECT table_schema, table_name
   FROM information_schema.tables
   WHERE table_schema = $1 AND table_type = 'BASE TABLE'`,
      [schema],
    );
    if (!tables.map((t) => t.table_name).includes(schema)) {
      throw new BadRequestException(`Table ${table} is not allowed`);
    }

    const publicationName = `${this.config.get<string>('PUBLICATION_PREFIX')}_${schema}`;

    const [existing] = await this.db.query<boolean>(
      `SELECT 1 FROM pg_publication_tables WHERE pubname = $1 AND schemaname = $2 AND tablename = $3`,
      [publicationName, schema, table],
    );
    if (!existing)
      throw new BadRequestException(
        `Table ${table} is not on the replica yet! please try again in 1 minute`,
      );
  }
}
