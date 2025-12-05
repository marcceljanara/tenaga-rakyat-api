import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { UserManagementService } from './user-management.service';
import {
  SuspendUserWalletRequest,
  UpdateUserVerificationRequest,
  UserDetailResponse,
  UserListQueryRequest,
  UserListResponse,
  UserStatsResponse,
} from '../../model/user-management.model';
import { WebResponse } from '../../model/web.model';
import { Roles } from '../../common/role/role.decorator';
import { ROLES } from '../../common/role/role';

@Controller('/api/user-management')
export class UserManagementController {
  constructor(private userManagementService: UserManagementService) {}

  @Get('/stats')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async getUserStats(): Promise<WebResponse<UserStatsResponse>> {
    const result = await this.userManagementService.getUserStats();
    return {
      data: result,
    };
  }

  @Get()
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('verification_status') verificationStatus?: string,
    @Query('search') search?: string,
  ): Promise<WebResponse<UserListResponse>> {
    const query: UserListQueryRequest = {
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
      role,
      verification_status: verificationStatus,
      search,
    };
    const result = await this.userManagementService.getAllUsers(query);
    return {
      data: result,
    };
  }

  @Get('/:userId')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async getUserById(
    @Param('userId') userId: string,
  ): Promise<WebResponse<UserDetailResponse>> {
    const result = await this.userManagementService.getUserById(userId);
    return {
      data: result,
    };
  }

  @Patch('/:userId/verification')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async updateVerificationStatus(
    @Param('userId') userId: string,
    @Body() request: UpdateUserVerificationRequest,
  ): Promise<WebResponse<UserDetailResponse>> {
    const result = await this.userManagementService.updateVerificationStatus(
      userId,
      request,
    );
    return {
      message: 'User verification status updated successfully',
      data: result,
    };
  }

  @Patch('/:userId/wallet/suspend')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async suspendUserWallet(
    @Param('userId') userId: string,
    @Body() request: SuspendUserWalletRequest,
  ): Promise<WebResponse<void>> {
    await this.userManagementService.suspendUserWallet(userId, request);
    return {
      message: 'User wallet suspended successfully',
    };
  }

  @Patch('/:userId/wallet/activate')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async activateUserWallet(
    @Param('userId') userId: string,
  ): Promise<WebResponse<void>> {
    await this.userManagementService.activateUserWallet(userId);
    return {
      message: 'User wallet activated successfully',
    };
  }

  @Patch('/:userId/account/suspend')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async suspendUserAccount(
    @Param('userId') userId: string,
  ): Promise<WebResponse<void>> {
    await this.userManagementService.suspendUserAccount(userId);
    return {
      message: 'User account suspended successfully',
    };
  }

  @Patch('/:userId/account/activate')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async activateUserAccount(
    @Param('userId') userId: string,
  ): Promise<WebResponse<void>> {
    await this.userManagementService.activateUserAccount(userId);
    return {
      message: 'User account activated successfully',
    };
  }

  @Delete('/:userId')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async deleteUser(
    @Param('userId') userId: string,
  ): Promise<WebResponse<void>> {
    await this.userManagementService.deleteUser(userId);
    return {
      message: 'User deleted successfully',
    };
  }
}
