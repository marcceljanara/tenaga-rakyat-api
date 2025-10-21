import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { ValidationService } from './common/validation/validation.service';
import { CommonModule } from './common/common.module';

@Module({
  imports: [UserModule, CommonModule],
  controllers: [],
  providers: [ValidationService],
})
export class AppModule {}
