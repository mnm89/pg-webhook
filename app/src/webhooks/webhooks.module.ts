import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhookDispatcherService } from './webhooks.dispatcher';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [WebhooksService, WebhookDispatcherService],
  controllers: [WebhooksController],
  exports: [WebhooksService, WebhookDispatcherService],
})
export class WebhooksModule {}
