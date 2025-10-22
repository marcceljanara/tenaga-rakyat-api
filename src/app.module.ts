import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [UserModule, CommonModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
