import { Injectable } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma.service';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

@Injectable()
export class TestService {
  constructor(private prismaService: PrismaService) {}

  async deleteAll() {
    await this.deleteUser();
    await this.deleteJob();
  }

  async deleteUser() {
    await this.prismaService.user.deleteMany();
    await this.prismaService.refreshToken.deleteMany();
  }

  async deleteJob() {
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

  async addProvider() {
    const idProvider = await this.prismaService.user.create({
      data: {
        id: randomUUID(),
        email: 'provider@email.com',
        full_name: 'test',
        password: await bcrypt.hash('1234test', 10),
        phone_number: '085212345672',
        role_id: 2,
      },
    });
    return idProvider.id;
  }

  async createJob(providerId) {
    const job = await this.prismaService.job.create({
      data: {
        title: 'Test Job',
        compensation_amount: 1000000,
        description: 'Test description',
        provider_id: providerId,
      },
    });
    return job;
  }
}
