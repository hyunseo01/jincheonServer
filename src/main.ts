import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

import cookieParser from 'cookie-parser';
import session from 'express-session';
import Redis from 'ioredis';

// [1] 성공한 프로젝트처럼 Named Import 사용 ({ RedisStore })
import { RedisStore } from 'connect-redis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const expressApp = app.getHttpAdapter().getInstance();

  // [2] 성공한 프로젝트 설정: 프록시 신뢰 (Railway 필수)
  expressApp.set('trust proxy', 1);

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.use(cookieParser());

  // [3] Redis 연결 (IORedis 버전으로 최적화)
  const redisUrl = configService.get<string>('REDIS_URL');
  let redisClient;

  if (redisUrl) {
    redisClient = new Redis(redisUrl);
  } else {
    redisClient = new Redis({
      host: configService.get<string>('REDIS_HOST'),
      port: configService.get<number>('REDIS_PORT'),
      password: configService.get<string>('REDIS_PASSWORD'), // 혹시 몰라 추가
    });
  }

  const sessionSecret =
    configService.get<string>('SESSION_SECRET') || 'default_secret_key';

  // 배포 환경인지 확인
  const isProduction = configService.get('NODE_ENV') === 'production';

  app.use(
    session({
      // [4] 성공한 프로젝트와 동일한 구조
      store: new RedisStore({
        client: redisClient,
        prefix: 'sess:', // 예전 프로젝트처럼 prefix 추가 (구분하기 좋음)
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,

      // [5] 성공한 프로젝트의 핵심 설정: proxy: true
      proxy: true,

      cookie: {
        httpOnly: true,
        // Railway는 HTTPS이므로 true, 로컬은 false 자동 처리
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24, // 1일
      },
    }),
  );

  await app.listen(configService.get<number>('PORT') || 3050);
}
bootstrap();
