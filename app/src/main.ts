import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';

NestFactory.create(AppModule, {
  logger: new ConsoleLogger({
    json: process.env.NODE_ENV === 'production',
    prefix: 'pg-webhook',
    logLevels: process.env.LOG
      ? (process.env.LOG.split(',') as (
          | 'log'
          | 'error'
          | 'warn'
          | 'debug'
          | 'verbose'
          | 'fatal'
        )[])
      : ['log', 'error', 'warn', 'debug', 'verbose', 'fatal'],
  }),
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
    return app.listen(process.env.PORT ?? 3000);
  })
  .then(() =>
    console.log('Server listening on port ' + (process.env.PORT ?? 3000)),
  )
  .catch((e) => console.error('Server Starting Error', e));
