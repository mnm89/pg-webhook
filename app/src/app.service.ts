import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DbService } from './db/db.service';
import { ReplicationService } from './replication/replication.service';
import { WebhooksService } from './webhooks/webhooks.service';

@Injectable()
export class AppService implements OnModuleInit {
  @Inject()
  private readonly configService: ConfigService;
  @Inject()
  private readonly dbService: DbService;
  @Inject()
  private readonly replicationService: ReplicationService;
  @Inject()
  private readonly webhooksService: WebhooksService;
  private readonly logger = new Logger(AppService.name);
  async onModuleInit() {
    await Promise.all([
      this.ensurePublication(),
      this.ensureSlot(),
      this.ensureIdentityFull(),
      this.ensureWebhooksTable(),
    ]);
    this.replicationService.subscribe(async (msg) => {
      const webhooks = await this.webhooksService.findByTableAndEvent(
        msg.relation.name,
        msg.tag.toUpperCase(),
      );
      this.logger.debug(
        JSON.stringify({
          event: msg.tag,
          table: msg.relation.name,
          schema: msg.relation.schema,
          new: 'new' in msg ? msg.new : null,
          old: 'old' in msg ? msg.old : null,
          key: 'key' in msg ? msg.key : null,
          webhooks: webhooks.length,
        }),
      );
    });
  }

  async ensurePublication() {
    const pubName = this.configService.get<string>('PUBLICATION_NAME');
    const rows = await this.dbService.query(
      'SELECT 1 FROM pg_publication WHERE pubname = $1',
      [pubName],
    );
    if (rows.length === 0) {
      await this.dbService.query(
        `CREATE PUBLICATION ${pubName} FOR ALL TABLES;`,
      );
      this.logger.log(`📢 Publication "${pubName}" created`);
    } else {
      this.logger.log(`📢 Publication "${pubName}" already exists`);
    }
  }
  async ensureSlot() {
    const slotName = this.configService.get<string>('SLOT_NAME');
    const rows = await this.dbService.query(
      'SELECT 1 FROM pg_replication_slots WHERE slot_name = $1 AND plugin = $2',
      [slotName, 'pgoutput'],
    );
    if (rows.length === 0) {
      await this.dbService.query(
        `SELECT * FROM pg_create_logical_replication_slot('${slotName}', 'pgoutput')`,
      );
      this.logger.log(`🎰 Slot "${slotName}" created`);
    } else {
      this.logger.log(`🎰 Slot "${slotName}" already exists`);
    }
  }
  async ensureIdentityFull() {
    const schemas: string[] = ['public'];
    await this.dbService.query(`
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
            -- Only apply to allowed schemas
          IF (obj.tbl::text LIKE ANY(ARRAY[${schemas.map((s) => "'" + s + ".%'").join(',')}])) THEN
            EXECUTE format('ALTER TABLE %s REPLICA IDENTITY FULL', obj.tbl);
          END IF;
          END LOOP;
        END;
        $$ LANGUAGE plpgsql;

        DROP EVENT TRIGGER IF EXISTS replica_identity_default;

        CREATE EVENT TRIGGER replica_identity_default
        ON ddl_command_end
        WHEN TAG IN ('CREATE TABLE')
        EXECUTE FUNCTION set_replica_identity_full();
      `);

    const tables = await this.dbService.query<{
      table_schema: string;
      table_name: string;
    }>(
      `SELECT table_schema, table_name
   FROM information_schema.tables
   WHERE table_schema = ANY($1) AND table_type = 'BASE TABLE'`,
      [schemas],
    );

    for (const tbl of tables) {
      await this.dbService.query(
        `ALTER TABLE ${tbl.table_schema}.${tbl.table_name} REPLICA IDENTITY FULL`,
      );
    }
  }
  async ensureWebhooksTable() {
    await this.dbService.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id SERIAL PRIMARY KEY,
        table_name TEXT NOT NULL,
        event_name TEXT NOT NULL CHECK (event_name IN ('INSERT', 'UPDATE', 'DELETE')),
        url TEXT NOT NULL,
        secret TEXT NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now()
      );  
    `);
  }
}
