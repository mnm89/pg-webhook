import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

NestFactory.create(AppModule)
  .then((app) => app.listen(process.env.PORT ?? 3000))
  .then(() =>
    console.log('Server listening on port ' + (process.env.PORT ?? 3000)),
  )
  .catch((e) => console.error('Server Starting Error', e));
