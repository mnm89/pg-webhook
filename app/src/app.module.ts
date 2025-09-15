import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { WebhooksModule } from './webhooks/webhooks.module';
import { DbModule } from './db/db.module';
import { ReplicationModule } from './replication/replication.module';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().uri().required(),
        PUBLICATION_NAME: Joi.string().required(),
        SLOT_NAME: Joi.string().required(),
        PORT: Joi.number().default(3000),
      }),
    }),
    WebhooksModule,
    DbModule,
    ReplicationModule,
  ],
  providers: [AppService],
})
export class AppModule {}
