import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DbService } from 'src/db/db.service';

const logger = new Logger('ReplicationBootstrap');
export const ensurePublications = async (
  config: ConfigService,
  db: DbService,
) => {
  // Read schemas from config
  const schemas: string[] = config.get<string[]>('SCHEMA_NAMES')!;
  const publicationPrefix = config.get<string>('PUBLICATION_PREFIX');

  for (const schema of schemas) {
    const publicationName = `${publicationPrefix}_${schema}`;

    const tables = await db.query<{ table_name: string }>(
      `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = $1
           AND table_type = 'BASE TABLE'`,
      [schema],
    );

    const pubExists = await db.query<{ pubname: string }>(
      `SELECT pubname FROM pg_publication WHERE pubname = $1`,
      [publicationName],
    );

    if (!tables.length) {
      if (!pubExists.length)
        await db.query(
          `CREATE PUBLICATION ${publicationName} WITH (publish = 'insert, update, delete');`,
        );
      logger.debug(
        `No tables found in schema "${schema}, empty publication ${publicationName} ensured`,
      );
      continue;
    }
    const tableNames = tables.map((t) => `${schema}.${t.table_name}`);

    if (pubExists.length === 0) {
      // create publication with all tables in schema
      const createSql = `CREATE PUBLICATION ${publicationName} FOR TABLE ${tableNames.join(
        ', ',
      )} WITH (publish = 'insert, update, delete')`;
      logger.debug(
        `Creating publication ${publicationName} for schema ${schema}`,
      );
      await db.query(createSql);
      logger.log(
        `Publication ${publicationName} created for schema "${schema}"`,
      );
    } else {
      // publication exists -> find which tables are already part of it
      const existing = await db.query<{
        schemaname: string;
        tablename: string;
      }>(
        `SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = $1`,
        [publicationName],
      );

      const existingSet = new Set(
        existing.map((r) => `${r.schemaname}.${r.tablename}`),
      );
      const toAdd = tableNames.filter((f) => !existingSet.has(f));

      if (toAdd.length > 0) {
        const alterSql = `ALTER PUBLICATION ${publicationName} ADD TABLE ${toAdd.join(',')}`;
        logger.debug(
          `Altering publication ${publicationName} to ADD ${toAdd.join(',')}`,
        );
        await db.query(alterSql);
        logger.log(
          `Publication ${publicationName} updated (added ${toAdd.length} tables)`,
        );
      } else {
        logger.debug(
          `Publication ${publicationName} already covers all tables in schema "${schema}"`,
        );
      }
    }
  }
};

export const ensureIdentityFull = async (
  config: ConfigService,
  db: DbService,
) => {
  const schemas = config.get<string[]>('SCHEMA_NAMES')!;
  const tables = await db.query<{
    table_schema: string;
    table_name: string;
  }>(
    `SELECT table_schema, table_name
   FROM information_schema.tables
   WHERE table_schema = ANY($1) AND table_type = 'BASE TABLE'`,
    [schemas],
  );

  for (const tbl of tables) {
    await db.query(
      `ALTER TABLE ${tbl.table_schema}.${tbl.table_name} REPLICA IDENTITY FULL`,
    );
  }
};

const ensureSlot = async (config: ConfigService, db: DbService) => {
  const slotName = config.get<string>('SLOT_NAME');
  const slotExists = await db.query<{ slot_name: string }>(
    `SELECT slot_name FROM pg_replication_slots WHERE slot_name = $1`,
    [slotName],
  );
  if (slotExists.length === 0) {
    await db.query(
      `SELECT * FROM pg_create_logical_replication_slot($1, 'pgoutput')`,
      [slotName],
    );
    logger.debug(`Created logical replication slot "${slotName}"`);
  } else {
    logger.debug(`Logical replication slot "${slotName}" already exists`);
  }
};
export default async function (config: ConfigService, db: DbService) {
  await ensureIdentityFull(config, db);
  await ensureSlot(config, db);
  await ensurePublications(config, db);
}
