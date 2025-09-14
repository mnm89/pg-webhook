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

  async ensurePublication() {
    const pubName = this.configService.get<string>('PUBLICATION_NAME');
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        'SELECT 1 FROM pg_publication WHERE pubname = $1',
        [pubName],
      );

      if (res.rowCount === 0) {
        await client.query(`CREATE PUBLICATION ${pubName} FOR ALL TABLES;`);
        this.logger.log(`📢 Publication "${pubName}" created`);
      } else {
        this.logger.log(`📢 Publication "${pubName}" already exists`);
      }
    } finally {
      client.release();
    }
  }
  async ensureSlot() {
    const slotName = this.configService.get<string>('SLOT_NAME');
    const client = await this.pool.connect();
    try {
      const res = await client.query(
        'SELECT 1 FROM pg_replication_slots WHERE slot_name = $1 AND plugin = $2',
        [slotName, 'pgoutput'],
      );

      if (res.rowCount === 0) {
        await client.query(
          `SELECT * FROM pg_create_logical_replication_slot('${slotName}', 'pgoutput')`,
        );
        this.logger.log(`🎰 Slot "${slotName}" created`);
      } else {
        this.logger.log(`🎰 Slot "${slotName}" already exists`);
      }
    } finally {
      client.release();
    }
  }

  async ensureIdentityFull() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        -- ===========================================================
        -- Event trigger: set REPLICA IDENTITY FULL on new tables
        -- ===========================================================

        CREATE OR REPLACE FUNCTION set_replica_identity_full()
        RETURNS event_trigger AS $$
        DECLARE
          obj record;
        BEGIN
          FOR obj IN
            SELECT objid::regclass AS tbl
            FROM pg_event_trigger_ddl_commands()
            WHERE command_tag = 'CREATE TABLE'
          LOOP
            EXECUTE format('ALTER TABLE %s REPLICA IDENTITY FULL', obj.tbl);
          END LOOP;
        END;
        $$ LANGUAGE plpgsql;

        DROP EVENT TRIGGER IF EXISTS replica_identity_default;

        CREATE EVENT TRIGGER replica_identity_default
        ON ddl_command_end
        WHEN TAG IN ('CREATE TABLE')
        EXECUTE FUNCTION set_replica_identity_full();
      `);

      await client.query(`
        -- ===========================================================
        -- Apply REPLICA IDENTITY FULL to all existing base tables
        -- ===========================================================
        DO $$
        DECLARE
          tbl record;
        BEGIN
          FOR tbl IN
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
              AND table_type = 'BASE TABLE'
          LOOP
            EXECUTE format(
              'ALTER TABLE %I.%I REPLICA IDENTITY FULL',
              tbl.table_schema, tbl.table_name
            );
          END LOOP;
        END;
        $$;
      `);
    } finally {
      client.release();
    }
  }

  // Optional helper to query the database
  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const res = await client.query<T>(sql, params);
      return res.rows;
    } finally {
      client.release();
    }
  }
}
