import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CreateHookDto, UpdateHookDto } from './webhooks.dto';
import { WebhooksGuard } from './webhooks.guard';

@Controller('webhooks')
@UseGuards(WebhooksGuard)
export class WebhooksController {
  @Inject()
  private readonly service: WebhooksService;

  @Post()
  create(@Body() dto: CreateHookDto) {
    return this.service.create(dto);
  }
  @Get()
  findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('schema_name') schemaName?: string,
    @Query('table_name') tableName?: string,
  ) {
    return this.service.findAll({
      limit: limit ? parseInt(limit, 10) : 10,
      offset: offset ? parseInt(offset, 10) : 0,
      schemaName,
      tableName,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.service.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: number, @Body() dto: UpdateHookDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.service.remove(Number(id));
  }
}
