import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ReplicationService } from './replication/replication.service';
import { WebhooksService } from './webhooks/webhooks.service';
import { WebhookDispatcherService } from './webhooks/webhooks.dispatcher';

@Injectable()
export class AppService implements OnModuleInit {
  @Inject()
  private readonly replicationService: ReplicationService;
  @Inject()
  private readonly webhooksService: WebhooksService;
  @Inject()
  private readonly dispatcherService: WebhookDispatcherService;
  private readonly logger = new Logger(AppService.name);
  onModuleInit() {
    this.replicationService.subscribe(async (msg) => {
      const webhooks = await this.webhooksService.findByTableAndEvent(
        msg.relation.schema,
        msg.relation.name,
        msg.tag.toUpperCase(),
      );
      const payload = {
        event: msg.tag.toUpperCase(),
        table: msg.relation.name,
        schema: msg.relation.schema,
        new: 'new' in msg ? msg.new : null,
        old: 'old' in msg ? msg.old : null,
        key: 'key' in msg ? msg.key : null,
      };
      this.logger.debug(JSON.stringify({ payload, webhooks: webhooks.length }));
      for (const webhook of webhooks) {
        this.logger.debug(`dispatching webhook ${webhook.url}`);
        this.dispatcherService.dispatch(webhook, payload).subscribe();
      }
    });
  }
}
