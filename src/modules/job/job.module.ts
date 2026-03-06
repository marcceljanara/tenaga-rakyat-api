import { Module } from '@nestjs/common';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { LocationService } from '../location/location.service';

@Module({
  controllers: [JobController],
  providers: [JobService, LocationService],
})
export class JobModule {}
