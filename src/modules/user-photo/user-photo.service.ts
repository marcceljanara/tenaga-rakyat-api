import { HttpException, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ValidationService } from '../../common/validation.service';
import { PrismaService } from '../../common/prisma.service';
import {
  AddUserPhotoRequest,
  EditUserPhotoRequest,
  UserPhotoResponse,
} from '../../model/user-photo.model';
import { UserPhotoValidation } from './user-photo.validation';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';

@Injectable()
export class UserPhotoService {
  private readonly uploadDir: string;

  constructor(
    private validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private configService: ConfigService,
  ) {
    this.uploadDir =
      this.configService.get<string>('UPLOAD_DIR') || './uploads/user-photos';
    void this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.info(`Created upload directory: ${this.uploadDir}`);
    }
  }

  async addPhoto(
    userId: string,
    file: Express.Multer.File,
    request: AddUserPhotoRequest,
  ): Promise<UserPhotoResponse> {
    this.logger.debug(
      `Adding photo for user ${userId}: ${JSON.stringify(request)}`,
    );

    if (!file) {
      throw new HttpException('Photo file is required', 400);
    }
    console.log(file.mimetype);

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new HttpException(
        'Invalid file type. Only JPEG, PNG, and WebP are allowed',
        422,
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new HttpException('File size must not exceed 5MB', 400);
    }

    const photoRequest = this.validationService.validate(
      UserPhotoValidation.ADD,
      request,
    ) as AddUserPhotoRequest;

    // Verify user exists
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${userId}-${randomUUID()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Save file
    await fs.writeFile(filePath, file.buffer);

    const photoUrl = `/uploads/user-photos/${fileName}`;

    const photo = await this.prismaService.userPhotos.create({
      data: {
        user_id: userId,
        photo_url: photoUrl,
        description: photoRequest.description,
      },
    });

    return this.toUserPhotoResponse(photo);
  }

  async getUserPhotos(userId: string): Promise<UserPhotoResponse[]> {
    this.logger.debug(`Getting photos for user ${userId}`);

    // Verify user exists
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    const photos = await this.prismaService.userPhotos.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return photos.map((photo) => this.toUserPhotoResponse(photo));
  }

  async getPhotoById(
    userId: string,
    photoId: bigint,
  ): Promise<UserPhotoResponse> {
    this.logger.debug(`Getting photo ${photoId} for user ${userId}`);

    const photo = await this.prismaService.userPhotos.findFirst({
      where: {
        id: photoId,
        user_id: userId,
      },
    });

    if (!photo) {
      throw new HttpException('Photo not found', 404);
    }

    return this.toUserPhotoResponse(photo);
  }

  async editPhotoDescription(
    userId: string,
    photoId: bigint,
    request: EditUserPhotoRequest,
  ): Promise<UserPhotoResponse> {
    this.logger.debug(
      `Editing photo ${photoId} for user ${userId}: ${JSON.stringify(request)}`,
    );

    const photoRequest = this.validationService.validate(
      UserPhotoValidation.EDIT,
      request,
    ) as EditUserPhotoRequest;

    // Verify photo exists and belongs to user
    const existingPhoto = await this.prismaService.userPhotos.findFirst({
      where: {
        id: photoId,
        user_id: userId,
      },
    });

    if (!existingPhoto) {
      throw new HttpException('Photo not found or unauthorized', 404);
    }

    const photo = await this.prismaService.userPhotos.update({
      where: {
        id: photoId,
      },
      data: {
        description: photoRequest.description,
      },
    });

    return this.toUserPhotoResponse(photo);
  }

  async deletePhoto(userId: string, photoId: bigint): Promise<void> {
    this.logger.debug(`Deleting photo ${photoId} for user ${userId}`);

    // Verify photo exists and belongs to user
    const photo = await this.prismaService.userPhotos.findFirst({
      where: {
        id: photoId,
        user_id: userId,
      },
    });

    if (!photo) {
      throw new HttpException('Photo not found or unauthorized', 404);
    }

    // Delete file from disk
    try {
      const fileName = path.basename(photo.photo_url);
      const filePath = path.join(this.uploadDir, fileName);
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.warn(`Failed to delete file: ${error.message}`);
    }

    await this.prismaService.userPhotos.delete({
      where: {
        id: photoId,
      },
    });
  }

  toUserPhotoResponse(photo: any): UserPhotoResponse {
    return {
      id: photo.id.toString(),
      user_id: photo.user_id,
      photo_url: photo.photo_url,
      description: photo.description,
      created_at: photo.created_at,
      updated_at: photo.updated_at,
    };
  }
}
