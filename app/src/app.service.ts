import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  LogicalReplicationService,
  Pgoutput,
  PgoutputPlugin,
} from 'pg-logical-replication';
import { DbService } from './db.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService implements OnModuleInit {
  @Inject()
  private readonly dbService: DbService;
  @Inject()
  private readonly configService: ConfigService;
  private readonly logger = new Logger(AppService.name);

  private _lrs?: LogicalReplicationService;
  private get lrs() {
    if (!this._lrs)
      this._lrs = new LogicalReplicationService({
        connectionString: this.configService.get<string>('DATABASE_URL'),
        logger: this.logger,
      });
    return this._lrs;
  }

  async onModuleInit() {
    await this.dbService.ensurePublication();
    await this.dbService.ensureSlot();
    await this.dbService.ensureIdentityFull();
    void this.subscribe();
  }

  private onSubscriptionError(error: Error) {
    this.logger.error(error);
    this._lrs?.removeAllListeners();
    this._lrs = undefined;
    setTimeout(() => {
      void this.subscribe();
    }, 5000);
  }
  private onSubscriptionStart() {
    this.logger.debug(
      `Listening to Postgres Publication "${this.configService.get<string>('PUBLICATION_NAME')}" on Slot "${this.configService.get<string>('SLOT_NAME')}"`,
    );
  }

  private onAcknowledgement(lsn: string): void {
    this.logger.debug('Postgres confirmed WAL up to ' + lsn);
  }

  private onHeartbeat(lsn: string, time: number, shouldRespond: boolean) {
    this.logger.verbose(
      `Heartbeat received at ${time} and should respond is: ${shouldRespond ? '✅' : '❌'}`,
    );
    if (shouldRespond) {
      void this.lrs.acknowledge(lsn);
    }
  }

  private onMessage(msg: Pgoutput.Message) {
    if (msg.tag === 'insert') {
      this.logger.log(
        `Inserted into ${msg.relation.schema}.${msg.relation.name} ${JSON.stringify(msg.new)}`,
      );
    }
    if (msg.tag === 'update') {
      this.logger.log(
        `Updated in ${msg.relation.schema}.${msg.relation.name} from ${JSON.stringify(msg.old)} to ${JSON.stringify(msg.new)}`,
      );
    }
    if (msg.tag === 'delete') {
      this.logger.log(
        `Deleted from ${msg.relation.schema}.${msg.relation.name} ${JSON.stringify(msg.old)}`,
      );
    }
  }

  private async subscribe() {
    const plugin = new PgoutputPlugin({
      protoVersion: 1,
      publicationNames: [this.configService.get<string>('PUBLICATION_NAME')!],
    });

    this.lrs.on('acknowledge', (lsn) => this.onAcknowledgement(lsn));
    this.lrs.on('error', (error) => this.onSubscriptionError(error));
    this.lrs.on('heartbeat', (lsn, time, shouldRespond) =>
      this.onHeartbeat(lsn, time, shouldRespond),
    );

    this.lrs.on('start', () => this.onSubscriptionStart());
    this.lrs.on('data', (lsn, msg: Pgoutput.Message) => {
      this.logger.debug('Processing WAL data from ' + lsn);
      this.onMessage(msg);
      void this.lrs.acknowledge(lsn);
    });

    await this.lrs.subscribe(
      plugin,
      this.configService.get<string>('SLOT_NAME')!,
    );
  }
}
