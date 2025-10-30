import { HttpException, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PrismaService } from '../../common/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';

@Injectable()
export class ProfilePictureService {
  private readonly uploadDir: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private configService: ConfigService,
  ) {
    this.uploadDir =
      this.configService.get<string>('PROFILE_UPLOAD_DIR') ||
      './uploads/profile-pictures';
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

  async uploadProfilePicture(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    this.logger.debug(`Uploading profile picture for user ${userId}`);

    if (!file) {
      throw new HttpException('Profile picture file is required', 400);
    }

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

    // Validate file size (max 2MB for profile picture)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new HttpException('File size must not exceed 2MB', 400);
    }

    // Verify user exists
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    // Delete old profile picture if exists
    if (user.profile_picture_url) {
      try {
        const oldFileName = path.basename(user.profile_picture_url);
        const oldFilePath = path.join(this.uploadDir, oldFileName);
        await fs.unlink(oldFilePath);
      } catch (error) {
        this.logger.warn(
          `Failed to delete old profile picture: ${error.message}`,
        );
      }
    }

    // Generate unique filename
    const fileExtension = path.extname(file.originalname);
    const fileName = `${userId}-${randomUUID()}${fileExtension}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Save file
    await fs.writeFile(filePath, file.buffer);

    const photoUrl = `/uploads/profile-pictures/${fileName}`;

    // Update user profile picture URL
    await this.prismaService.user.update({
      where: { id: userId },
      data: { profile_picture_url: photoUrl },
    });

    return photoUrl;
  }

  async deleteProfilePicture(userId: string): Promise<void> {
    this.logger.debug(`Deleting profile picture for user ${userId}`);

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('User not found', 404);
    }

    if (!user.profile_picture_url) {
      throw new HttpException('No profile picture to delete', 404);
    }

    // Delete file from disk
    try {
      const fileName = path.basename(user.profile_picture_url);
      const filePath = path.join(this.uploadDir, fileName);
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.warn(`Failed to delete file: ${error.message}`);
    }

    // Remove URL from database
    await this.prismaService.user.update({
      where: { id: userId },
      data: { profile_picture_url: null },
    });
  }
}
