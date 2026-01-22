import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { GroupModule } from './group/group.module';
import { DailyModule } from './daily/daily.module';
import { IssueModule } from './issue/issue.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // 1. 환경변수 모듈
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 2. TypeORM (DB) 연결
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: true,
      }),
    }),
    UsersModule,
    AuthModule,
    GroupModule,
    DailyModule,
    IssueModule,
  ],
})
export class AppModule {}
