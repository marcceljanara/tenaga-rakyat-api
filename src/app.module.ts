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
import { UserManagementModule } from './modules/user-management/user-management.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReportModule } from './modules/report/report.module';
import { AuthModule } from './modules/auth/auth.module';
import { LocationModule } from './modules/location/location.module';
import { ReviewModule } from './modules/review/review.module';

@Module({
  imports: [
    CommonModule,
    UserModule,
    UserPhotoModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
      serveStaticOptions: {
        index: false,
        setHeaders: (res, path, stat) => {
          res.set('X-Content-Type-Options', 'nosniff');
          res.set('Content-Security-Policy', "default-src 'none'");
        },
      },
      serveRoot: '/uploads',
    }),
    ApplicationModule,
    JobModule,
    PaymentModule,
    UserManagementModule,
    AdminModule,
    ReportModule,
    AuthModule,
    LocationModule,
    ReviewModule,
  ],
  controllers: [],
  providers: [CronService],
})
export class AppModule { }
