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

@Controller('/api/admins')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Post()
  @HttpCode(201)
  @Roles([ROLES.SUPER_ADMIN])
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
  async deleteAdmin(
    @Param('adminId') adminId: string,
  ): Promise<WebResponse<void>> {
    await this.adminService.deleteAdmin(adminId);
    return {
      message: 'Admin deleted successfully',
    };
  }
}
