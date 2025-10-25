import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { UserService } from './user.service';
import {
  LoginUserRequest,
  RegisterUserRequest,
  UserResponse,
} from '../../model/user.model';
import { WebResponse } from '../../model/web.model';
import type { Request, Response } from 'express';

@Controller('/api/users')
export class UserController {
  constructor(private userService: UserService) {}

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
}
