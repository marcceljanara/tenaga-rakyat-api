import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserPhotoService } from './user-photo.service';
import {
  AddUserPhotoRequest,
  EditUserPhotoRequest,
  UserPhotoResponse,
} from '../../model/user-photo.model';
import { WebResponse } from '../../model/web.model';
import { Auth } from '../../common/auth/auth.decorator';
import { Roles } from '../../common/role/role.decorator';
import type { User } from '@prisma/client';
import { ROLES } from '../../common/role/role';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('User Photos')
@ApiBearerAuth()
@Controller('/api/users/photos')
export class UserPhotoController {
  constructor(private userPhotoService: UserPhotoService) {}

  @Post()
  @HttpCode(201)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ 
    summary: 'Add photo', 
    description: 'Upload new photo to user portfolio. Allowed: JPEG, PNG, WebP. Max size: 5MB. File is saved with unique filename.' 
  })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        photo: { type: 'string', format: 'binary', description: 'Photo file' },
        description: { type: 'string', example: 'My portfolio work' }
      }
    }
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Photo uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Photo uploaded successfully' },
        data: { $ref: '#/components/schemas/UserPhotoResponse' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Photo file required or file size exceeds 5MB' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 422, description: 'Invalid file type' })
  async addPhoto(
    @Auth() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() request: AddUserPhotoRequest,
  ): Promise<WebResponse<UserPhotoResponse>> {
    const result = await this.userPhotoService.addPhoto(user.id, file, request);
    return {
      message: 'Photo uploaded successfully',
      data: result,
    };
  }

  @Get()
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiOperation({ summary: 'Get user photos', description: 'Get all photos for logged-in user, sorted by creation date (newest first)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Photos retrieved',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserPhotoResponse' }
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserPhotos(
    @Auth() user: User,
  ): Promise<WebResponse<UserPhotoResponse[]>> {
    const result = await this.userPhotoService.getUserPhotos(user.id);
    return {
      data: result,
    };
  }

  @Get('/:photoId')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiOperation({ summary: 'Get photo by ID', description: 'Get specific photo details (must be owner)' })
  @ApiParam({ name: 'photoId', type: Number, description: 'Photo ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Photo details retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/UserPhotoResponse' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Photo not found' })
  async getPhotoById(
    @Auth() user: User,
    @Param('photoId', ParseIntPipe) photoId: number,
  ): Promise<WebResponse<UserPhotoResponse>> {
    const result = await this.userPhotoService.getPhotoById(user.id, photoId);
    return {
      data: result,
    };
  }

  @Put('/:photoId')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiOperation({ summary: 'Edit photo description', description: 'Update photo description (must be owner)' })
  @ApiParam({ name: 'photoId', type: Number, description: 'Photo ID' })
  @ApiBody({ type: EditUserPhotoRequest })
  @ApiResponse({ 
    status: 200, 
    description: 'Photo description updated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Photo description updated successfully' },
        data: { $ref: '#/components/schemas/UserPhotoResponse' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Photo not found or unauthorized' })
  async editPhotoDescription(
    @Auth() user: User,
    @Param('photoId', ParseIntPipe) photoId: number,
    @Body() request: EditUserPhotoRequest,
  ): Promise<WebResponse<UserPhotoResponse>> {
    const result = await this.userPhotoService.editPhotoDescription(
      user.id,
      photoId,
      request,
    );
    return {
      message: 'Photo description updated successfully',
      data: result,
    };
  }

  @Delete('/:photoId')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiOperation({ summary: 'Delete photo', description: 'Delete photo from portfolio and storage (must be owner)' })
  @ApiParam({ name: 'photoId', type: Number, description: 'Photo ID' })
  @ApiResponse({ 
    status: 200, 
    description: 'Photo deleted',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Photo deleted successfully' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Photo not found or unauthorized' })
  async deletePhoto(
    @Auth() user: User,
    @Param('photoId', ParseIntPipe) photoId: number,
  ): Promise<WebResponse<void>> {
    await this.userPhotoService.deletePhoto(user.id, photoId);
    return {
      message: 'Photo deleted successfully',
    };
  }
}
