import { Controller, Get, Query } from '@nestjs/common';
import { LogsService } from './logs.service';
import { QueryLogDto } from './dto/query-log.dto';

@Controller('api/logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async getLogs(@Query() query: QueryLogDto) {
    return this.logsService.getLogs(query);
  }
}
