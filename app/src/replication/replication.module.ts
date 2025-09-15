import { Module } from '@nestjs/common';
import { ReplicationService } from './replication.service';

@Module({
  providers: [ReplicationService],
  exports: [ReplicationService],
})
export class ReplicationModule {}
