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

@Controller('/api/users/photos')
export class UserPhotoController {
  constructor(private userPhotoService: UserPhotoService) {}

  @Post()
  @HttpCode(201)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @UseInterceptors(FileInterceptor('photo'))
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
