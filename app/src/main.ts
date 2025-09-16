import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const logger = new Logger('NestApplication');

NestFactory.create(AppModule, {
  logger: false,
})
  .then((app) => {
    app.useGlobalPipes(
      new ValidationPipe({
        disableErrorMessages: false,
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.useLogger(
      new ConsoleLogger({
        json: app.get(ConfigService).get<boolean>('LOG_JSON')!,
        prefix: 'pg-webhook',
        logLevels: app
          .get(ConfigService)
          .get<
            ('verbose' | 'debug' | 'log' | 'warn' | 'error' | 'fatal')[]
          >('LOG_LEVELS')!,
      }),
    );
    return app
      .listen(app.get(ConfigService).get<number>('PORT')!)
      .then(() => app);
  })
  .then((app) =>
    logger.log(
      'Server listening on port ' + app.get(ConfigService).get('PORT'),
    ),
  )
  .catch((e) => console.error('Server Starting Error', e));
