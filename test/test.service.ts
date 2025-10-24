import { Injectable } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma.service';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

@Injectable()
export class TestService {
  constructor(private prismaService: PrismaService) {}

  async deleteAll() {
    await this.deleteUser();
  }

  async deleteUser() {
    await this.prismaService.user.deleteMany();
    await this.prismaService.refreshToken.deleteMany();
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
}
