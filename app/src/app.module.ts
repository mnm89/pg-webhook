import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { WebhooksModule } from './webhooks/webhooks.module';
import { DbModule } from './db/db.module';
import { ReplicationModule } from './replication/replication.module';
import { validationSchema } from './config/validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    WebhooksModule,
    DbModule,
    ReplicationModule,
  ],
  providers: [AppService],
})
export class AppModule {}
