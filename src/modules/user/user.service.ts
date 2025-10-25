import { HttpException, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ValidationService } from '../../common/validation.service';
import { PrismaService } from '../../common/prisma.service';
import bcrypt from 'bcrypt';
import {
  LoginUserRequest,
  LoginUserResponse,
  RegisterUserRequest,
  UserResponse,
} from '../../model/user.model';
import { UserValidation } from './user.validation';
import { JwtService } from '@nestjs/jwt';
import { addDays } from 'date-fns';
import { randomUUID } from 'crypto';

@Injectable()
export class UserService {
  constructor(
    private validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(request: RegisterUserRequest): Promise<UserResponse> {
    this.logger.debug(`Register new user ${JSON.stringify(request)}`);
    const id: string = randomUUID();
    const registerRequest: RegisterUserRequest =
      this.validationService.validate(UserValidation.REGISTER, request);

    const existing = await this.prismaService.user.findFirst({
      where: {
        OR: [
          { email: registerRequest.email },
          { phone_number: registerRequest.phone_number },
        ],
      },
    });

    if (existing) {
      if (existing.email === registerRequest.email) {
        throw new HttpException('Email already exists', 400);
      }

      if (existing.phone_number === registerRequest.phone_number) {
        throw new HttpException('Phone number already exists', 400);
      }
    }

    registerRequest.password = await bcrypt.hash(registerRequest.password, 10);
    const user = await this.prismaService.user.create({
      data: {
        ...registerRequest,
        id,
      },
    });

    return {
      id: user.id,
      full_name: user.full_name,
    };
  }

  async login(request: LoginUserRequest): Promise<LoginUserResponse> {
    this.logger.debug(`Login user ${JSON.stringify(request)}`);
    const loginRequest: LoginUserRequest = this.validationService.validate(
      UserValidation.LOGIN,
      request,
    );
    const user = await this.prismaService.user.findUnique({
      where: {
        email: loginRequest.email,
      },
    });
    if (!user) {
      throw new HttpException('Email is invalid', 401);
    }

    const isPasswordValid = await bcrypt.compare(
      loginRequest.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new HttpException('Password is invalid', 401);
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role_id: String(user.role_id),
    });

    const refreshToken = randomUUID();
    await this.prismaService.refreshToken.create({
      data: {
        token: refreshToken,
        user_id: user.id,
        expires_at: addDays(new Date(), 7),
      },
    });

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  async refresh(refreshToken: string): Promise<LoginUserResponse> {
    this.logger.debug(`Refresh token user ${JSON.stringify(refreshToken)}`);
    if (!refreshToken) {
      throw new HttpException('Missing refresh token', 401);
    }
    const stored = await this.prismaService.refreshToken.findUnique({
      where: {
        token: refreshToken,
      },
      include: {
        user: true,
      },
    });

    if (!stored || stored.expires_at < new Date()) {
      throw new HttpException('Refresh token tidak valid atau kadaluara', 401);
    }

    await this.prismaService.refreshToken.delete({
      where: {
        token: refreshToken,
      },
    });

    const newToken = randomUUID();
    await this.prismaService.refreshToken.create({
      data: {
        token: newToken,
        user_id: stored.user.id,
        expires_at: addDays(new Date(), 7),
      },
    });

    const newAccessToken = await this.jwt.signAsync({
      sub: stored.user.id,
      role_id: String(stored.user.role_id),
    });

    return {
      access_token: newAccessToken,
      refresh_token: newToken,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    this.logger.debug(`Refresh token user ${JSON.stringify(refreshToken)}`);
    if (!refreshToken) {
      throw new HttpException('Missing refresh token', 401);
    }
    await this.prismaService.refreshToken.deleteMany({
      where: {
        token: refreshToken,
      },
    });
  }
}
