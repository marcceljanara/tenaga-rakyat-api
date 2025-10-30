import { Module } from '@nestjs/common';
import { UserPhotoService } from './user-photo.service';
import { UserPhotoController } from './user-photo.controller';

@Module({
  providers: [UserPhotoService],
  controllers: [UserPhotoController],
})
export class UserPhotoModule {}
