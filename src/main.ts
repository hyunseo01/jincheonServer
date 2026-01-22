import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

import cookieParser from 'cookie-parser';
import session from 'express-session';
import Redis from 'ioredis';

// [중요] 상단에서 connect-redis import를 제거했습니다.
// 내부에서 require로 처리합니다.

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Railway 배포 환경(Nginx Proxy) 설정
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

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

  // Redis 클라이언트 생성
  const redisUrl = configService.get<string>('REDIS_URL');
  let redisClient;

  if (redisUrl) {
    redisClient = new Redis(redisUrl);
  } else {
    redisClient = new Redis({
      host: configService.get<string>('REDIS_HOST'),
      port: configService.get<number>('REDIS_PORT'),
    });
  }

  const sessionSecret =
    configService.get<string>('SESSION_SECRET') || 'default_secret_key';

  const isProduction = configService.get('NODE_ENV') === 'production';

  // [핵심 해결책]
  // 상단 import 대신 여기서 require로 불러옵니다.
  // 모듈 시스템 차이(CommonJS/ESM)를 런타임에 직접 해결합니다.
  let RedisStore: any = require('connect-redis');
  // .default가 있으면 그걸 쓰고, 없으면 그냥 씁니다.
  if (RedisStore.default) {
    RedisStore = RedisStore.default;
  }

  app.use(
    session({
      // 이제 RedisStore는 무조건 생성자(Constructor)입니다.
      store: new RedisStore({ client: redisClient }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24,
      },
    }),
  );

  await app.listen(configService.get<number>('PORT') || 3050);
}
bootstrap();
