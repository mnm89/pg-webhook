import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DbService } from './db.service';
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
  ],
  controllers: [AppController],
  providers: [AppService, DbService],
})
export class AppModule {}
