import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { CommonModule } from './common/common.module';
import { UserPhotoModule } from './modules/user-photo/user-photo.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ApplicationModule } from './modules/application/application.module';
import { JobModule } from './modules/job/job.module';
import { PaymentModule } from './modules/payment/payment.module';
import { CronService } from './infrastructure/cron/cron.service';

@Module({
  imports: [
    CommonModule,
    UserModule,
    UserPhotoModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    ApplicationModule,
    JobModule,
    PaymentModule,
  ],
  controllers: [],
  providers: [CronService],
})
export class AppModule {}
