import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhookDispatcherService } from './webhooks.dispatcher';
import { HttpModule } from '@nestjs/axios';
import { HttpLoggerMiddleware } from './webhooks.middleware';

@Module({
  imports: [HttpModule],
  providers: [WebhooksService, WebhookDispatcherService],
  controllers: [WebhooksController],
  exports: [WebhooksService, WebhookDispatcherService],
})
export class WebhooksModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes(WebhooksController);
  }
}
