import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('User Authentication & Profile')
@Controller('/api/users')
export class UserController {
  constructor(
    private userService: UserService,
    private profilePictureService: ProfilePictureService,
  ) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ 
    summary: 'Register user', 
    description: 'Register new user account (Public). Creates user and wallet. Sends verification email asynchronously (registration succeeds even if email fails).' 
  })
  @ApiBody({ type: RegisterUserRequest })
  @ApiResponse({ 
    status: 200, 
    description: 'User registered successfully. Verification email sent.',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-here' },
            full_name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'user@example.com' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Email or phone number already exists' , schema: {
    type: 'object',
    properties: {
      errors: { type: 'string', example: 'Email or phone number already exists'}
    }
  }})
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
  @ApiOperation({ summary: 'Login', description: 'Login user and set HTTP-only cookies (access_token, refresh_token). Access token valid for 15 minutes, refresh token valid for 7 days.' })
  @ApiBody({ type: LoginUserRequest })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful. Cookies set.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Login success' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password', schema: {
    type: 'object',
    properties: {
      errors: { type: 'string', example: 'Invalid email or password'}
    }
  } })
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
  @ApiOperation({ summary: 'Refresh token', description: 'Refresh access token using refresh token from cookie. Old refresh token is deleted, new tokens are issued.' })
  @ApiResponse({ 
    status: 200, 
    description: 'Token refreshed. New cookies set.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Token refreshed' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid refresh token' , schema: {
    type: 'object',
    properties: {
      errors: { type: 'string', example: 'Missing or invalid refresh token'}
    }
  }})
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
  @ApiOperation({ summary: 'Logout', description: 'Logout user and clear cookies. Deletes refresh token from database.' })
  @ApiResponse({ 
    status: 200, 
    description: 'Logged out successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Missing refresh token' , schema: {
    type: 'object',
    properties: {
      errors: { type: 'string', example: 'Missing refresh token'}
    }
  }})
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile', description: 'Get logged-in user profile with role, photos (up to recent ones), and all details' })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/UserResponse' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' , schema: {
    type: 'object',
    properties: {
      errors: { type: 'string', example: 'User not found'}
    }
  }})
  async profile(@Auth() user: User): Promise<WebResponse<UserResponse>> {
    const response = await this.userService.profile(user.id);
    return {
      data: response,
    };
  }

  @Get('/profile/:id')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile by ID', description: 'Get user profile by ID with role, photos (up to recent ones), and all details' })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/UserResponse' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' , schema: {
    type: 'object',
    properties: {
      errors: { type: 'string', example: 'User not found'}
    }
  }})
  async getProfileById(
    @Auth() user: User,
    @Param('id') userId: string,
  ): Promise<WebResponse<UserResponse>> {
    const response = await this.userService.getUserProfileById(userId);
    return {
      data: response,
    }
  }

  @Put('/profile')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit profile', description: 'Update user profile information (full_name, phone_number, about, cv_url)' })
  @ApiBody({ type: EditUserRequest })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile updated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Profile berhasil diperbarui' },
        data: { $ref: '#/components/schemas/UserResponse' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' , schema: {
    type: 'object',
    properties: {
      errors: { type: 'string', example: 'User not found'}
    }
  }})
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
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Upload profile picture', 
    description: 'Upload or update profile picture. Allowed: JPEG, PNG, WebP. Max size: 2MB. Old picture is automatically deleted.' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile picture uploaded',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Profile picture uploaded successfully' },
        data: {
          type: 'object',
          properties: {
            profile_picture_url: { type: 'string', example: '/uploads/profile-pictures/uuid-filename.jpg' }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'File required or file size exceeds 2MB' , schema: {
    type: 'object',
    properties: {
      errors: { type: 'string', example: 'File required or file size exceeds 2MB'}
    }
  }})
  @ApiResponse({ status: 404, description: 'User not found' , schema: {
    type: 'object',
    properties: {
      errors: { type: 'string', example: 'User not found'}
    }
  }})
  @ApiResponse({ status: 422, description: 'Invalid file type' , schema: {
    type: 'object',
    properties: {
      errors: { type: 'string', example: 'Invalid file type'}
    }
  }})
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete profile picture', description: 'Delete user profile picture from storage and database' })
  @ApiResponse({ 
    status: 200, 
    description: 'Profile picture deleted',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Profile picture deleted successfully' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found or no profile picture to delete' , schema: {
    type: 'object',
    properties: {
      errors: { type: 'string', example: 'User not found or no profile picture to delete'}
    }
  }})
  async deleteProfilePicture(@Auth() user: User): Promise<WebResponse<void>> {
    await this.profilePictureService.deleteProfilePicture(user.id);
    return {
      message: 'Profile picture deleted successfully',
    };
  }
}
