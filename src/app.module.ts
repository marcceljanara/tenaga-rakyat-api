import { Module } from '@nestjs/common';
import { UserModule } from './modules/user/user.module';
import { CommonModule } from './common/common.module';
import { UserPhotoModule } from './modules/user-photo/user-photo.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ApplicationModule } from './modules/application/application.module';

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
