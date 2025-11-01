import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  EditUserRequest,
  LoginUserRequest,
  RegisterUserRequest,
  UserResponse,
} from '../../model/user.model';
import { WebResponse } from '../../model/web.model';
import type { Request, Response } from 'express';
import { Auth } from '../../common/auth/auth.decorator';
import { Roles } from '../../common/role/role.decorator';
import type { User } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProfilePictureService } from './profile-picture.service';
import { ROLES } from '../../common/role/role';

@Controller('/api/users')
export class UserController {
  constructor(
    private userService: UserService,
    private profilePictureService: ProfilePictureService,
  ) {}

  @Post()
  @HttpCode(200)
  async register(
    @Body() request: RegisterUserRequest,
  ): Promise<WebResponse<UserResponse>> {
    const result = await this.userService.register(request);
    return {
      data: result,
    };
  }

  @Post('/login')
  @HttpCode(200)
  async login(
    @Body() request: LoginUserRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token: accessToken, refresh_token: refreshToken } =
      await this.userService.login(request);
    res
      .cookie('access_token', accessToken, {
        httpOnly: true,
        maxAge: 15 * 60 * 1000,
      })
      .cookie('refresh_token', refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ message: 'Login success' });
  }

  @Post('/refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.['refresh_token'] as string;
    const { refresh_token: newRefreshToken, access_token: accessToken } =
      await this.userService.refresh(refreshToken);
    res
      .cookie('access_token', accessToken, {
        httpOnly: true,
        maxAge: 15 * 60 * 1000,
      })
      .cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({ message: 'Token refreshed' });
  }

  @Post('/logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['refresh_token'] as string;
    await this.userService.logout(refreshToken);
    res
      .clearCookie('access_token')
      .clearCookie('refresh_token')
      .json({ message: 'Logged out' });
  }

  @Get('/profile')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async profile(@Auth() user: User): Promise<WebResponse<UserResponse>> {
    const response = await this.userService.profile(user.id);
    return {
      data: response,
    };
  }

  @Put('/profile')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async editProfile(
    @Auth() user: User,
    @Body() request: EditUserRequest,
  ): Promise<WebResponse<UserResponse>> {
    const response = await this.userService.editProfile(user.id, request);
    return {
      message: 'Profile berhasil diperbarui',
      data: response,
    };
  }
  @Post('/profile/picture')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @UseInterceptors(FileInterceptor('profile_picture'))
  async uploadProfilePicture(
    @Auth() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<WebResponse<{ profile_picture_url: string }>> {
    const photoUrl = await this.profilePictureService.uploadProfilePicture(
      user.id,
      file,
    );
    return {
      message: 'Profile picture uploaded successfully',
      data: { profile_picture_url: photoUrl },
    };
  }

  @Delete('/profile/picture')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async deleteProfilePicture(@Auth() user: User): Promise<WebResponse<void>> {
    await this.profilePictureService.deleteProfilePicture(user.id);
    return {
      message: 'Profile picture deleted successfully',
    };
  }
}
