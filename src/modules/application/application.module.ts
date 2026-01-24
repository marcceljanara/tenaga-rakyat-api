import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { LocationService } from '../location/location.service';

@Module({
  providers: [ApplicationService, LocationService],
  controllers: [ApplicationController],
})
export class ApplicationModule {}
