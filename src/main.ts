import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

import cookieParser from 'cookie-parser';
import session from 'express-session';

// [중요] 모듈 전체를 가져옵니다.
import * as ConnectRedis from 'connect-redis';
import Redis from 'ioredis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // [Railway 배포 필수] Nginx/Load Balancer 뒤에서도 쿠키가 Secure로 동작하게 함
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.enableCors({
    origin: true, // 프론트엔드 도메인 확정 시 해당 도메인 배열로 변경 권장
    credentials: true, // 쿠키 주고받기 허용
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

  // [Redis 연결 설정]
  // Railway는 'REDIS_URL'이라는 환경변수를 제공합니다 (비번 포함된 긴 주소).
  // 로컬에서는 HOST/PORT를 씁니다.
  const redisUrl = configService.get<string>('REDIS_URL');
  let redisClient;

  if (redisUrl) {
    redisClient = new Redis(redisUrl); // Production (Railway)
  } else {
    redisClient = new Redis({
      host: configService.get<string>('REDIS_HOST'),
      port: configService.get<number>('REDIS_PORT'),
    }); // Local
  }

  // [세션 시크릿]
  const sessionSecret =
    configService.get<string>('SESSION_SECRET') || 'default_secret_key';

  // [배포 환경 확인]
  const isProduction = configService.get('NODE_ENV') === 'production';

  // [핵심 수정] RedisStore 생성자 추출 로직
  // 라이브러리 버전에 따라 export 방식이 다르므로 안전하게 가져옵니다.
  const RedisStore = (ConnectRedis as any).default || (ConnectRedis as any);

  app.use(
    session({
      // [핵심 수정] TypeScript 에러 방지를 위해 (RedisStore as any) 사용
      store: new (RedisStore as any)({ client: redisClient }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        // Railway는 HTTPS를 쓰므로 secure: true여야 크롬에서 쿠키가 구워짐
        secure: isProduction ? true : false,
        // 프론트(Vercel/Railway)와 백엔드 도메인이 다르면 'none'이어야 함
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 1000 * 60 * 60 * 24, // 1일
      },
    }),
  );

  await app.listen(configService.get<number>('PORT') || 3050);
}
bootstrap();
