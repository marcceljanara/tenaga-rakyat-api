import { Injectable } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma.service';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

@Injectable()
export class TestService {
  constructor(private prismaService: PrismaService) {}

  async disconnect() {
    await this.prismaService.$disconnect();
  }

  async deleteAll() {
    await this.prismaService.user.deleteMany();
    await this.prismaService.refreshToken.deleteMany();
    await this.prismaService.userPhotos.deleteMany();
    await this.prismaService.job.deleteMany();
    await this.prismaService.jobApplication.deleteMany();
  }

  async addUser() {
    await this.prismaService.user.create({
      data: {
        id: randomUUID(),
        email: 'test@email.com',
        full_name: 'test',
        password: await bcrypt.hash('1234test', 10),
        phone_number: '085212345678',
        role_id: 1,
      },
    });
  }

  async addAnotherUser() {
    await this.prismaService.user.create({
      data: {
        id: randomUUID(),
        email: 'another@email.com',
        full_name: 'test',
        password: await bcrypt.hash('1234test', 10),
        phone_number: '085212345671',
        role_id: 1,
      },
    });
  }

  async addProvider(): Promise<string> {
    const hashedPassword = await bcrypt.hash('1234test', 10);
    const user = await this.prismaService.user.create({
      data: {
        full_name: 'Test Provider',
        phone_number: '+628123456789',
        email: 'provider@email.com',
        password: hashedPassword,
        role_id: BigInt(2), // Provider role
      },
    });
    return user.id;
  }

  async addAnotherProvider(): Promise<string> {
    const hashedPassword = await bcrypt.hash('1234test', 10);
    const user = await this.prismaService.user.create({
      data: {
        full_name: 'Another Provider',
        phone_number: '+628987654321',
        email: 'another@email.com',
        password: hashedPassword,
        role_id: BigInt(2), // Provider role
      },
    });
    return user.id;
  }

  async createJob(providerId: string) {
    const job = await this.prismaService.job.create({
      data: {
        provider_id: providerId,
        title: 'Test Job Posting',
        description:
          'This is a test job description with enough characters to pass validation',
        location: 'Jakarta',
        compensation_amount: 10000000,
        status: 'OPEN',
        completed_at: new Date(),
      },
    });
    return job;
  }

  async createJobWithDetails(
    providerId: string,
    details: {
      title: string;
      description: string;
      location?: string;
      compensation_amount: number;
    },
  ) {
    const job = await this.prismaService.job.create({
      data: {
        provider_id: providerId,
        title: details.title,
        description: details.description,
        location: details.location,
        compensation_amount: details.compensation_amount,
        status: 'OPEN',
        completed_at: new Date(),
      },
    });
    return job;
  }

  async updateJobStatus(jobId: number, status: string) {
    const job = await this.prismaService.job.update({
      where: { id: jobId },
      data: {
        status: status as any,
        ...(status === 'COMPLETED' && { completed_at: new Date() }),
      },
    });
    return job;
  }
}
