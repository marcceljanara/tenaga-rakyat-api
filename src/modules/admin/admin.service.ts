import { HttpException, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ValidationService } from '../../common/validation.service';
import { PrismaService } from '../../common/prisma.service';
import {
  AdminListResponse,
  AdminResponse,
  ChangeAdminPasswordRequest,
  CreateAdminRequest,
  UpdateAdminRequest,
} from '../../model/admin.model';
import * as bcrypt from 'bcrypt';
import { ROLES } from '../../common/role/role';
import { AdminValidation } from './admin.validation';
import { CryptoUtil } from '../../common/crypto.util';

@Injectable()
export class AdminService {
  constructor(
    private validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
  ) {}

  async createAdmin(request: CreateAdminRequest): Promise<AdminResponse> {
    this.logger.debug(`Creating admin: ${JSON.stringify(request)}`);

    const adminRequest = this.validationService.validate(
      AdminValidation.CREATE,
      request,
    ) as CreateAdminRequest;

    // Check if email already exists
    const existingEmail = await this.prismaService.user.findUnique({
      where: { email: adminRequest.email },
    });

    if (existingEmail) {
      throw new HttpException('Email already registered', 409);
    }

    // Check if phone number already exists
    const existingPhone = await this.prismaService.user.findUnique({
      where: { phone_number: adminRequest.phone_number },
    });

    if (existingPhone) {
      throw new HttpException('Phone number already registered', 409);
    }

    // Get ADMIN role
    const adminRole = await this.prismaService.role.findUnique({
      where: { id: ROLES.ADMIN },
    });

    if (!adminRole) {
      throw new HttpException('Admin role not found', 500);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminRequest.password, 10);

    const admin = await this.prismaService.user.create({
      data: {
        full_name: adminRequest.full_name,
        phone_number: adminRequest.phone_number,
        email: adminRequest.email,
        password: hashedPassword,
        role_id: adminRole.id,
        verification_status: 'VERIFIED',
      },
      include: {
        role: true,
      },
    });

    return this.toAdminResponse(admin);
  }

  async getAllAdmins(
    page: number = 1,
    limit: number = 10,
  ): Promise<AdminListResponse> {
    this.logger.debug(`Getting all admins - page: ${page}, limit: ${limit}`);

    const skip = (page - 1) * limit;

    // Get ADMIN role
    const adminRole = await this.prismaService.role.findUnique({
      where: { id: ROLES.ADMIN },
    });

    if (!adminRole) {
      throw new HttpException('Admin role not found', 500);
    }

    const [admins, total] = await Promise.all([
      this.prismaService.user.findMany({
        where: {
          role_id: adminRole.id,
          is_deleted: false,
        },
        include: {
          role: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prismaService.user.count({
        where: {
          role_id: adminRole.id,
        },
      }),
    ]);

    return {
      admins: admins.map((admin) => this.toAdminResponse(admin)),
      total,
      page,
      limit,
    };
  }

  async getAdminById(adminId: string): Promise<AdminResponse> {
    this.logger.debug(`Getting admin by id: ${adminId}`);

    const admin = await this.prismaService.user.findUnique({
      where: { id: adminId, is_deleted: false },
      include: {
        role: true,
      },
    });

    if (!admin) {
      throw new HttpException('Admin not found', 404);
    }

    // Verify user is admin
    if (admin.role.id !== ROLES.ADMIN) {
      throw new HttpException('User is not an admin', 403);
    }

    return this.toAdminResponse(admin);
  }

  async updateAdmin(
    adminId: string,
    request: UpdateAdminRequest,
  ): Promise<AdminResponse> {
    this.logger.debug(`Updating admin ${adminId}: ${JSON.stringify(request)}`);

    const updateRequest = this.validationService.validate(
      AdminValidation.UPDATE,
      request,
    ) as UpdateAdminRequest;

    // Verify admin exists
    const existingAdmin = await this.prismaService.user.findUnique({
      where: { id: adminId, is_deleted: false },
      include: { role: true },
    });

    if (!existingAdmin) {
      throw new HttpException('Admin not found', 404);
    }

    if (existingAdmin.role.id !== ROLES.ADMIN) {
      throw new HttpException('User is not an admin', 403);
    }

    // Check email uniqueness if updating
    if (updateRequest.email && updateRequest.email !== existingAdmin.email) {
      const emailExists = await this.prismaService.user.findUnique({
        where: { email: updateRequest.email },
      });

      if (emailExists) {
        throw new HttpException('Email already registered', 409);
      }
    }

    // Check phone number uniqueness if updating
    if (
      updateRequest.phone_number &&
      updateRequest.phone_number !== existingAdmin.phone_number
    ) {
      const phoneExists = await this.prismaService.user.findUnique({
        where: { phone_number: updateRequest.phone_number },
      });

      if (phoneExists) {
        throw new HttpException('Phone number already registered', 409);
      }
    }

    const admin = await this.prismaService.user.update({
      where: { id: adminId },
      data: {
        ...(updateRequest.full_name && { full_name: updateRequest.full_name }),
        ...(updateRequest.phone_number && {
          phone_number: updateRequest.phone_number,
        }),
        ...(updateRequest.email && { email: updateRequest.email }),
      },
      include: {
        role: true,
      },
    });

    return this.toAdminResponse(admin);
  }

  async changeAdminPassword(
    adminId: string,
    request: ChangeAdminPasswordRequest,
  ): Promise<void> {
    this.logger.debug(`Changing password for admin ${adminId}`);

    const passwordRequest = this.validationService.validate(
      AdminValidation.CHANGE_PASSWORD,
      request,
    ) as ChangeAdminPasswordRequest;

    const admin = await this.prismaService.user.findUnique({
      where: { id: adminId, is_deleted: false },
      include: { role: true },
    });

    if (!admin) {
      throw new HttpException('Admin not found', 404);
    }

    if (admin.role.id !== ROLES.ADMIN) {
      throw new HttpException('User is not an admin', 403);
    }

    const hashedPassword = await bcrypt.hash(passwordRequest.new_password, 10);

    await this.prismaService.user.update({
      where: { id: adminId },
      data: {
        password: hashedPassword,
      },
    });
  }

  async deleteAdmin(adminId: string): Promise<void> {
    this.logger.debug(`Deleting admin ${adminId}`);

    const admin = await this.prismaService.user.findUnique({
      where: { id: adminId },
      include: { role: true },
    });

    if (!admin) {
      throw new HttpException('Admin not found', 404);
    }

    if (admin.role.id !== ROLES.ADMIN) {
      throw new HttpException('User is not an admin', 403);
    }

    await this.prismaService.user.update({
      where: { id: adminId },
      data: {
        is_deleted: true,
        about: null,
        average_rating: null,
        cv_url: null,
        ktp_number_encrypted: null,
        profile_picture_url: null,
        email: `deleted_${admin.id}_${Date.now()}_@mail.com`,
        phone_number: `del_${CryptoUtil.hash8(admin.id)}`,
        full_name: `deleted_${admin.id}_${Date.now()}`,
        deleted_at: new Date(),
      },
    });
  }

  toAdminResponse(admin: any): AdminResponse {
    return {
      id: admin.id,
      full_name: admin.full_name,
      phone_number: admin.phone_number,
      email: admin.email,
      role: admin.role.name,
      profile_picture_url: admin.profile_picture_url,
      verification_status: admin.verification_status,
      created_at: admin.created_at,
      updated_at: admin.updated_at,
    };
  }
}
