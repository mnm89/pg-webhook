import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CreateHookDto } from './webhooks.dto';

@Controller('webhooks')
export class WebhooksController {
  @Inject()
  private readonly webhooksService: WebhooksService;

  @Post()
  create(@Body() dto: CreateHookDto) {
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
