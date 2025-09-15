import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { CreateWebhookDto } from './dto/create';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  @Inject()
  private readonly webhooksService: WebhooksService;

  @Post()
  create(@Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(dto);
  }

  @Get()
  findAll() {
    return this.webhooksService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.webhooksService.remove(Number(id));
  }
}
