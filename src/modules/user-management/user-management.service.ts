import { HttpException, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ValidationService } from '../../common/validation.service';
import { PrismaService } from '../../common/prisma.service';
import {
  SuspendUserWalletRequest,
  UpdateUserVerificationRequest,
  UserDetailResponse,
  UserListQueryRequest,
  UserListResponse,
  UserResponse,
  UserStatsResponse,
} from '../../model/user-management.model';
import { ROLES } from '../../common/role/role';
import { UserManagementValidation } from './user-management.validation';
import { CryptoUtil } from '../../common/crypto.util';

@Injectable()
export class UserManagementService {
  constructor(
    private validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
  ) {}

  async getAllUsers(query: UserListQueryRequest): Promise<UserListResponse> {
    this.logger.debug(`Getting all users: ${JSON.stringify(query)}`);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // gunakan AND supaya semua kondisi digabung
    const where: any = { AND: [] };

    if (query.role) {
      const role = await this.prismaService.role.findUnique({
        where: { name: query.role },
      });

      if (role) {
        where.AND.push({ role_id: role.id });
      }
    }

    if (query.verification_status) {
      where.AND.push({ verification_status: query.verification_status });
    }

    if (query.search) {
      where.AND.push({
        OR: [
          { full_name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { phone_number: { contains: query.search } },
        ],
      });
    }

    const adminRoles = await this.prismaService.role.findMany({
      where: { id: { in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] } },
    });

    where.AND.push({
      role_id: { notIn: adminRoles.map((r) => r.id) },
    });

    // Soft delete filter
    where.AND.push({ is_deleted: false });

    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        include: {
          role: true,
          wallets: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),

      this.prismaService.user.count({ where }),
    ]);

    return {
      users: users.map((u) => this.toUserResponse(u)),
      total,
      page,
      limit,
    };
  }

  async getUserById(userId: string): Promise<UserDetailResponse> {
    this.logger.debug(`Getting user by id: ${userId}`);

    const user = await this.prismaService.user.findUnique({
      where: { id: userId, is_deleted: false },
      include: {
        role: true,
        wallets: true,
        user_photos: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    // Prevent managing admin accounts
    if (user.role.id === ROLES.ADMIN || user.role.id === ROLES.SUPER_ADMIN) {
      throw new HttpException('Cannot manage admin accounts', 403);
    }

    return this.toUserDetailResponse(user);
  }

  async updateVerificationStatus(
    userId: string,
    request: UpdateUserVerificationRequest,
  ): Promise<UserDetailResponse> {
    this.logger.debug(
      `Updating verification status for user ${userId}: ${JSON.stringify(request)}`,
    );

    const verificationRequest = this.validationService.validate(
      UserManagementValidation.UPDATE_VERIFICATION,
      request,
    ) as UpdateUserVerificationRequest;

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    if (user.role.id === ROLES.ADMIN || user.role.id === ROLES.SUPER_ADMIN) {
      throw new HttpException('Cannot manage admin accounts', 403);
    }

    const updatedUser = await this.prismaService.user.update({
      where: { id: userId },
      data: {
        verification_status: verificationRequest.verification_status,
      },
      include: {
        role: true,
        wallets: true,
      },
    });

    return this.toUserDetailResponse(updatedUser);
  }

  async suspendUserWallet(
    userId: string,
    request: SuspendUserWalletRequest,
  ): Promise<void> {
    this.logger.debug(`Suspending wallet for user ${userId}`);

    this.validationService.validate(
      UserManagementValidation.SUSPEND_WALLET,
      request,
    ) as SuspendUserWalletRequest;

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: { role: true, wallets: true },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    if (user.role.id === ROLES.ADMIN || user.role.id === ROLES.SUPER_ADMIN) {
      throw new HttpException('Cannot manage admin accounts', 403);
    }

    if (!user.wallets) {
      throw new HttpException('User does not have a wallet', 404);
    }

    await this.prismaService.wallet.update({
      where: { id: user.wallets.id },
      data: {
        status: 'SUSPENDED',
      },
    });
  }

  async activateUserWallet(userId: string): Promise<void> {
    this.logger.debug(`Activating wallet for user ${userId}`);

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: { role: true, wallets: true },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    if (user.role.id === ROLES.ADMIN || user.role.id === ROLES.SUPER_ADMIN) {
      throw new HttpException('Cannot manage admin accounts', 403);
    }

    if (!user.wallets) {
      throw new HttpException('User does not have a wallet', 404);
    }

    await this.prismaService.wallet.update({
      where: { id: user.wallets.id },
      data: {
        status: 'ACTIVE',
      },
    });
  }

  async suspendUserAccount(userId: string): Promise<void> {
    this.logger.debug(`suspend account for user ${userId}`);

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: { role: true, wallets: true },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    if (user.role.id === ROLES.ADMIN || user.role.id === ROLES.SUPER_ADMIN) {
      throw new HttpException('Cannot manage admin accounts', 403);
    }

    if (!user.wallets) {
      throw new HttpException('User does not have a wallet', 404);
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: user.wallets?.id },
        data: {
          status: 'SUSPENDED',
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          is_suspended: true,
          suspended_at: new Date(),
        },
      });
    });
  }

  async activateUserAccount(userId: string): Promise<void> {
    this.logger.debug(`activate account for user ${userId}`);

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: { role: true, wallets: true },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    if (user.role.id === ROLES.ADMIN || user.role.id === ROLES.SUPER_ADMIN) {
      throw new HttpException('Cannot manage admin accounts', 403);
    }

    if (!user.wallets) {
      throw new HttpException('User does not have a wallet', 404);
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: user.wallets?.id },
        data: {
          status: 'ACTIVE',
        },
      });
      await tx.user.update({
        where: { id: user.id },
        data: {
          is_suspended: false,
          suspended_at: null,
        },
      });
    });
  }

  async deleteUser(userId: string): Promise<void> {
    this.logger.debug(`Deleting user ${userId}`);

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    const wallet = await this.prismaService.wallet.findUnique({
      where: {
        user_id: userId,
      },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    if (!wallet) {
      throw new HttpException('Wallet tidak ditemukan', 404);
    }

    if (user.role.id === ROLES.ADMIN || user.role.id === ROLES.SUPER_ADMIN) {
      throw new HttpException('Cannot delete admin accounts', 403);
    }

    await this.prismaService.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          is_deleted: true,
          about: null,
          average_rating: null,
          cv_url: null,
          ktp_number_encrypted: null,
          profile_picture_url: null,
          email: `deleted_${user.id}_${Date.now()}_@mail.com`,
          phone_number: `del_${CryptoUtil.hash8(user.id)}`,
          full_name: `deleted_${user.id}_${Date.now()}`,
          deleted_at: new Date(),
        },
      });
      await tx.wallet.update({
        where: {
          user_id: wallet.user_id,
        },
        data: {
          status: 'CLOSED',
        },
      });
    });
  }

  async getUserStats(): Promise<UserStatsResponse> {
    this.logger.debug('Getting user statistics');

    const adminRoles = await this.prismaService.role.findMany({
      where: {
        id: { in: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
      },
    });

    const workerRole = await this.prismaService.role.findUnique({
      where: { id: ROLES.PEKERJA },
    });

    const providerRole = await this.prismaService.role.findUnique({
      where: { id: ROLES.PEMBERI_KERJA },
    });

    const excludeRoleIds = adminRoles.map((r) => r.id);

    const [
      totalUsers,
      verifiedUsers,
      unverifiedUsers,
      pendingVerification,
      rejectedVerification,
      workers,
      jobProviders,
    ] = await Promise.all([
      this.prismaService.user.count({
        where: { role_id: { notIn: excludeRoleIds } },
      }),
      this.prismaService.user.count({
        where: {
          role_id: { notIn: excludeRoleIds },
          verification_status: 'VERIFIED',
        },
      }),
      this.prismaService.user.count({
        where: {
          role_id: { notIn: excludeRoleIds },
          verification_status: 'UNVERIFIED',
        },
      }),
      this.prismaService.user.count({
        where: {
          role_id: { notIn: excludeRoleIds },
          verification_status: 'PENDING',
        },
      }),
      this.prismaService.user.count({
        where: {
          role_id: { notIn: excludeRoleIds },
          verification_status: 'REJECTED',
        },
      }),
      this.prismaService.user.count({
        where: { role_id: workerRole?.id },
      }),
      this.prismaService.user.count({
        where: { role_id: providerRole?.id },
      }),
    ]);

    return {
      total_users: totalUsers,
      verified_users: verifiedUsers,
      unverified_users: unverifiedUsers,
      pending_verification: pendingVerification,
      rejected_verification: rejectedVerification,
      workers,
      job_providers: jobProviders,
    };
  }

  toUserDetailResponse(user: any): UserDetailResponse {
    return {
      id: user.id,
      full_name: user.full_name,
      phone_number: user.phone_number,
      email: user.email,
      role: user.role.name,
      profile_picture_url: user.profile_picture_url,
      about: user.about,
      cv_url: user.cv_url,
      verification_status: user.verification_status,
      average_rating: user.average_rating?.toString(),
      is_suspended: user.is_suspended,
      is_deleted: user.is_deleted,
      wallet: user.wallets
        ? {
            id: user.wallets.id.toString(),
            balance: user.wallets.balance.toString(),
            status: user.wallets.status,
          }
        : undefined,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }
  toUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      full_name: user.full_name,
      phone_number: user.phone_number,
      email: user.email,
      role: user.role.name,
      verification_status: user.verification_status,
      is_suspended: user.is_suspended,
      wallet: user.wallets
        ? {
            status: user.wallets.status,
          }
        : undefined,
    };
  }
}
