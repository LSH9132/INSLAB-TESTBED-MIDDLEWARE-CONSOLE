import { Module } from '@nestjs/common';
import { TcpService } from './tcp.service';

@Module({
  providers: [TcpService],
})
export class TcpModule {}
