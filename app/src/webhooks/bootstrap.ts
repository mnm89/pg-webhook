import { ConfigService } from '@nestjs/config';
import { DbService } from '../db/db.service';

export default async function (config: ConfigService, db: DbService) {
  await db.query(`
      CREATE SCHEMA IF NOT EXISTS webhook;
    `);

  await db.query(`
      CREATE TABLE IF NOT EXISTS webhook.hooks (
        id SERIAL PRIMARY KEY,
        schema_name TEXT DEFAULT 'public',
        table_name TEXT NOT NULL,
        event_name TEXT NOT NULL CHECK (event_name IN ('INSERT', 'UPDATE', 'DELETE')),
        url TEXT NOT NULL,
        secret TEXT NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT now()
      );  
    `);
  await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'hooks_unique_subscription'
            AND conrelid = 'webhook.hooks'::regclass
        ) THEN
          ALTER TABLE webhook.hooks
          ADD CONSTRAINT hooks_unique_subscription
          UNIQUE (schema_name, table_name, event_name, url);
        END IF;
      END$$;
`);
  await db.query(`
      CREATE TABLE IF NOT EXISTS webhook.logs (
        id BIGSERIAL PRIMARY KEY,
        hook_id INT NOT NULL REFERENCES webhook.hooks(id) ON DELETE CASCADE,
        status_code INT,
        response_time_ms INT,
        success BOOLEAN,
        error TEXT,
        created_at TIMESTAMP DEFAULT now()
      );
    `);
}
