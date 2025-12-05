import { Module } from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import { UserManagementController } from './user-management.controller';

@Module({
  providers: [UserManagementService],
  controllers: [UserManagementController],
})
export class UserManagementModule {}
