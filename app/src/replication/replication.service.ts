import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LogicalReplicationService,
  Pgoutput,
  PgoutputPlugin,
} from 'pg-logical-replication';
import initReplication, {
  ensureIdentityFull,
  ensurePublications,
} from './bootstrap';
import { DbService } from '../db/db.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class ReplicationService implements OnModuleInit {
  @Inject()
  private readonly configService: ConfigService;
  @Inject()
  private readonly dbService: DbService;
  private readonly logger = new Logger(ReplicationService.name);

  private _lrs?: LogicalReplicationService;
  private get lrs() {
    if (!this._lrs)
      this._lrs = new LogicalReplicationService({
        connectionString: this.configService.get<string>('DATABASE_URL'),
        logger: this.logger,
      });
    return this._lrs;
  }
  private get publicationNames() {
    return this.configService
      .get<string[]>('SCHEMA_NAMES')!
      .map(
        (s) => `${this.configService.get<string>('PUBLICATION_PREFIX')}_${s}`,
      );
  }
  async onModuleInit() {
    await initReplication(this.configService, this.dbService);
  }
  subscribe(
    onMessage: (
      msg:
        | Pgoutput.MessageInsert
        | Pgoutput.MessageUpdate
        | Pgoutput.MessageDelete,
    ) => void | Promise<void>,
  ) {
    const plugin = new PgoutputPlugin({
      protoVersion: 1,
      publicationNames: this.publicationNames,
    });
    this.lrs.on('start', () =>
      this.logger.debug(
        `Listening to Postgres Publication "${this.publicationNames.join(',')}" ` +
          `on Slot "${this.configService.get<string>('SLOT_NAME')}"`,
      ),
    );
    this.lrs.on('acknowledge', (lsn) =>
      this.logger.verbose('Postgres confirmed WAL up to ' + lsn),
    );
    this.lrs.on('error', (error) => this.logger.error(error));
    this.lrs.on('heartbeat', (lsn, time, shouldRespond) => {
      this.logger.verbose(
        `Heartbeat received at ${time} and should respond is: ${shouldRespond ? '✅' : '❌'}`,
      );
      if (shouldRespond) {
        void this.lrs.acknowledge(lsn);
      }
    });

    this.lrs.on('data', (lsn, msg: Pgoutput.Message) => {
      this.logger.debug('Reading WAL from ' + lsn);
      if (msg.tag === 'insert' || msg.tag === 'update' || msg.tag === 'delete')
        void onMessage(msg);
      void this.lrs.acknowledge(lsn);
    });

    void this.lrs
      .subscribe(plugin, this.configService.get<string>('SLOT_NAME')!)
      .catch(() => {
        this._lrs?.removeAllListeners();
        this._lrs = undefined;
        setTimeout(() => {
          void this.subscribe(onMessage);
        }, 5000);
      });
  }

  @Cron('1 * * * * *', {
    name: 'ensurePublicationsAndIdentityFull',
  })
  async ensurePublicationsAndIdentityFull() {
    await ensureIdentityFull(this.configService, this.dbService);
    await ensurePublications(this.configService, this.dbService);
  }
}
