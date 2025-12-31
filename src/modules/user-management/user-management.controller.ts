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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin - User Management')
@ApiBearerAuth()
@Controller('/api/user-management')
export class UserManagementController {
  constructor(private userManagementService: UserManagementService) {}

  @Get('/stats')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiOperation({ 
    summary: 'Get user statistics', 
    description: 'Get user statistics for admin dashboard. Excludes admin accounts from counts.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User stats retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/UserStatsResponse' }
      }
    }
  })
  async getUserStats(): Promise<WebResponse<UserStatsResponse>> {
    const result = await this.userManagementService.getUserStats();
    return {
      data: result,
    };
  }

  @Get()
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiOperation({ 
    summary: 'Get all users', 
    description: 'Get list of all users with filtering and pagination. Excludes admins and soft-deleted users. Can filter by role, verification status, and search by name/email/phone.' 
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by role name (e.g., "Worker", "Job Provider")' })
  @ApiQuery({ name: 'verification_status', required: false, enum: ['UNVERIFIED', 'EMAIL_VERIFIED', 'FULL_VERIFIED'] })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name, email, or phone number' })
  @ApiResponse({ 
    status: 200, 
    description: 'User list retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/UserListResponse' }
      }
    }
  })
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
  @ApiOperation({ 
    summary: 'Get user by ID', 
    description: 'Get detailed user information including wallet and recent photos. Cannot view admin accounts.' 
  })
  @ApiParam({ name: 'userId', type: String, description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'User details retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/UserDetailResponse' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Cannot manage admin accounts' })
  @ApiResponse({ status: 404, description: 'User not found' })
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
  @ApiOperation({ 
    summary: 'Update verification status', 
    description: 'Update user verification status. Cannot update admin accounts.' 
  })
  @ApiParam({ name: 'userId', type: String, description: 'User ID' })
  @ApiBody({ type: UpdateUserVerificationRequest })
  @ApiResponse({ 
    status: 200, 
    description: 'Verification status updated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User verification status updated successfully' },
        data: { $ref: '#/components/schemas/UserDetailResponse' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Cannot manage admin accounts' })
  @ApiResponse({ status: 404, description: 'User not found' })
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
  @ApiOperation({ 
    summary: 'Suspend wallet', 
    description: 'Suspend user wallet (changes status to SUSPENDED). Cannot suspend admin wallets.' 
  })
  @ApiParam({ name: 'userId', type: String, description: 'User ID' })
  @ApiBody({ type: SuspendUserWalletRequest })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet suspended',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User wallet suspended successfully' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Cannot manage admin accounts' })
  @ApiResponse({ status: 404, description: 'User not found or user does not have a wallet' })
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
  @ApiOperation({ 
    summary: 'Activate wallet', 
    description: 'Activate suspended wallet (changes status to ACTIVE). Cannot activate admin wallets.' 
  })
  @ApiParam({ name: 'userId', type: String, description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Wallet activated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User wallet activated successfully' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Cannot manage admin accounts' })
  @ApiResponse({ status: 404, description: 'User not found or user does not have a wallet' })
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
  @ApiOperation({ 
    summary: 'Suspend account', 
    description: 'Suspend user account and wallet (sets is_suspended=true, wallet status=SUSPENDED). Cannot suspend admin accounts.' 
  })
  @ApiParam({ name: 'userId', type: String, description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Account suspended',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User account suspended successfully' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Cannot manage admin accounts' })
  @ApiResponse({ status: 404, description: 'User not found or user does not have a wallet' })
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
  @ApiOperation({ 
    summary: 'Activate account', 
    description: 'Activate suspended account and wallet (sets is_suspended=false, wallet status=ACTIVE, clears suspended_at). Cannot activate admin accounts.' 
  })
  @ApiParam({ name: 'userId', type: String, description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Account activated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User account activated successfully' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Cannot manage admin accounts' })
  @ApiResponse({ status: 404, description: 'User not found or user does not have a wallet' })
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
  @ApiOperation({ 
    summary: 'Delete user', 
    description: 'Soft delete user account (sets is_deleted=true, anonymizes data: email, phone, name, clears sensitive info, closes wallet). Cannot delete admin accounts.' 
  })
  @ApiParam({ name: 'userId', type: String, description: 'User ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'User deleted',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User deleted successfully' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'Cannot delete admin accounts' })
  @ApiResponse({ status: 404, description: 'User or wallet not found' })
  async deleteUser(
    @Param('userId') userId: string,
  ): Promise<WebResponse<void>> {
    await this.userManagementService.deleteUser(userId);
    return {
      message: 'User deleted successfully',
    };
  }
}
