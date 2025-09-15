import { Inject, Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class WebhooksService {
  @Inject()
  private readonly dbService: DbService;
}
