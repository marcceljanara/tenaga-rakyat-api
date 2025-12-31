import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  AdminListResponse,
  AdminResponse,
  ChangeAdminPasswordRequest,
  CreateAdminRequest,
  UpdateAdminRequest,
} from '../../model/admin.model';
import { WebResponse } from '../../model/web.model';
import { Roles } from '../../common/role/role.decorator';
import { ROLES } from '../../common/role/role';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('Admin Management')
@ApiBearerAuth()
@Controller('/api/admins')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post()
  @HttpCode(201)
  @Roles([ROLES.SUPER_ADMIN])
  @ApiOperation({ summary: 'Create new admin', description: 'Create a new admin account (Super Admin only)' })
  @ApiBody({ type: CreateAdminRequest })
  @ApiResponse({ 
    status: 201, 
    description: 'Admin created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Admin created successfully' },
        data: { $ref: '#/components/schemas/AdminResponse' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Super Admin only' })
  @ApiResponse({ status: 409, description: 'Email or phone number already registered' })
  async createAdmin(
    @Body() request: CreateAdminRequest,
  ): Promise<WebResponse<AdminResponse>> {
    const result = await this.adminService.createAdmin(request);
    return {
      message: 'Admin created successfully',
      data: result,
    };
  }

  @Get()
  @HttpCode(200)
  @Roles([ROLES.SUPER_ADMIN])
  @ApiOperation({ summary: 'Get all admins', description: 'Retrieve list of all admins with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of admins retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/AdminListResponse' }
      }
    }
  })
  async getAllAdmins(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<WebResponse<AdminListResponse>> {
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;
    const result = await this.adminService.getAllAdmins(pageNum, limitNum);
    return {
      data: result,
    };
  }

  @Get('/:adminId')
  @HttpCode(200)
  @Roles([ROLES.SUPER_ADMIN])
  @ApiOperation({ summary: 'Get admin by ID', description: 'Retrieve admin details by ID' })
  @ApiParam({ name: 'adminId', type: String, description: 'Admin ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Admin details retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/AdminResponse' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'User is not an admin' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async getAdminById(
    @Param('adminId') adminId: string,
  ): Promise<WebResponse<AdminResponse>> {
    const result = await this.adminService.getAdminById(adminId);
    return {
      data: result,
    };
  }

  @Put('/:adminId')
  @HttpCode(200)
  @Roles([ROLES.SUPER_ADMIN])
  @ApiOperation({ summary: 'Update admin', description: 'Update admin information' })
  @ApiParam({ name: 'adminId', type: String, description: 'Admin ID' })
  @ApiBody({ type: UpdateAdminRequest })
  @ApiResponse({ 
    status: 200, 
    description: 'Admin updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Admin updated successfully' },
        data: { $ref: '#/components/schemas/AdminResponse' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'User is not an admin' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  @ApiResponse({ status: 409, description: 'Email or phone number already registered' })
  async updateAdmin(
    @Param('adminId') adminId: string,
    @Body() request: UpdateAdminRequest,
  ): Promise<WebResponse<AdminResponse>> {
    const result = await this.adminService.updateAdmin(adminId, request);
    return {
      message: 'Admin updated successfully',
      data: result,
    };
  }

  @Put('/:adminId/password')
  @HttpCode(200)
  @Roles([ROLES.SUPER_ADMIN])
  @ApiOperation({ summary: 'Change admin password', description: 'Change password for specific admin' })
  @ApiParam({ name: 'adminId', type: String, description: 'Admin ID' })
  @ApiBody({ type: ChangeAdminPasswordRequest })
  @ApiResponse({ 
    status: 200, 
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Admin password changed successfully' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'User is not an admin' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async changeAdminPassword(
    @Param('adminId') adminId: string,
    @Body() request: ChangeAdminPasswordRequest,
  ): Promise<WebResponse<void>> {
    await this.adminService.changeAdminPassword(adminId, request);
    return {
      message: 'Admin password changed successfully',
    };
  }

  @Delete('/:adminId')
  @HttpCode(200)
  @Roles([ROLES.SUPER_ADMIN])
  @ApiOperation({ summary: 'Delete admin', description: 'Soft delete admin account (data will be anonymized)' })
  @ApiParam({ name: 'adminId', type: String, description: 'Admin ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Admin deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Admin deleted successfully' }
      }
    }
  })
  @ApiResponse({ status: 403, description: 'User is not an admin' })
  @ApiResponse({ status: 404, description: 'Admin not found' })
  async deleteAdmin(
    @Param('adminId') adminId: string,
  ): Promise<WebResponse<void>> {
    await this.adminService.deleteAdmin(adminId);
    return {
      message: 'Admin deleted successfully',
    };
  }
}
