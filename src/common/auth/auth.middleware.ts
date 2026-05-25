import { HttpException, Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
  async use(req: any, res: any, next: () => void) {
    const token = req.cookies?.['access_token'] as string;
    if (!token) {
      throw new HttpException('Unauthorized', 401);
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      req.user = payload;
      next();
    } catch (err) {
      throw new HttpException('Unauthorized', 401);
    }
  }
}

@Injectable()
export class OptionalAuthMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
  async use(req: any, res: any, next: () => void) {
    const token = req.cookies?.['access_token'] as string;
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
        req.user = payload;
      } catch (err) {
        // Ignore invalid token, act as guest
      }
    }
    next();
  }
}
