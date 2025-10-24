import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private jwtService: JwtService) {}
  use(req: any, res: any, next: () => void) {
    const token = req.cookies['access_token'] as string;
    if (!token) return next();

    const payload = this.jwtService.verifyAsync(token);
    req.user = payload;
    next();
  }
}
