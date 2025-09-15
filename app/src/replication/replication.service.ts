import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LogicalReplicationService,
  Pgoutput,
  PgoutputPlugin,
} from 'pg-logical-replication';

@Injectable()
export class ReplicationService {
  @Inject()
  private readonly configService: ConfigService;
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
      publicationNames: [this.configService.get<string>('PUBLICATION_NAME')!],
    });

    this.lrs.on('acknowledge', (lsn) => this.onAcknowledgement(lsn));
    this.lrs.on('error', (error) => {
      this.onSubscriptionError(error);
      setTimeout(() => {
        void this.subscribe(onMessage);
      }, 5000);
    });
    this.lrs.on('heartbeat', (lsn, time, shouldRespond) =>
      this.onHeartbeat(lsn, time, shouldRespond),
    );

    this.lrs.on('start', () => this.onSubscriptionStart());
    this.lrs.on('data', (lsn, msg: Pgoutput.Message) => {
      this.logger.debug('Reading WAL from ' + lsn);
      if (msg.tag === 'insert' || msg.tag === 'update' || msg.tag === 'delete')
        void onMessage(msg);
      void this.lrs.acknowledge(lsn);
    });

    void this.lrs.subscribe(
      plugin,
      this.configService.get<string>('SLOT_NAME')!,
    );
  }
  private onSubscriptionError(error: Error) {
    this.logger.error(error);
    this._lrs?.removeAllListeners();
    this._lrs = undefined;
  }
  private onSubscriptionStart() {
    this.logger.debug(
      `Listening to Postgres Publication "${this.configService.get<string>('PUBLICATION_NAME')}" ` +
        `on Slot "${this.configService.get<string>('SLOT_NAME')}"`,
    );
  }

  private onAcknowledgement(lsn: string): void {
    this.logger.verbose('Postgres confirmed WAL up to ' + lsn);
  }

  private onHeartbeat(lsn: string, time: number, shouldRespond: boolean) {
    this.logger.verbose(
      `Heartbeat received at ${time} and should respond is: ${shouldRespond ? '✅' : '❌'}`,
    );
    if (shouldRespond) {
      void this.lrs.acknowledge(lsn);
    }
  }
}
