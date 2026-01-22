import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

import cookieParser from 'cookie-parser';
import session from 'express-session';
import Redis from 'ioredis';

// [1] 성공한 프로젝트처럼 Named Import 사용
import { RedisStore } from 'connect-redis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const expressApp = app.getHttpAdapter().getInstance();

  // [수정] Cloudflare를 쓴다면 프록시 홉이 늘어날 수 있으므로 1보다는 true(모두 신뢰)가 안전합니다.
  expressApp.set('trust proxy', true);

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

  // [3] Redis 연결
  const redisUrl = configService.get<string>('REDIS_URL');
  let redisClient;

  if (redisUrl) {
    redisClient = new Redis(redisUrl);
  } else {
    redisClient = new Redis({
      host: configService.get<string>('REDIS_HOST'),
      port: configService.get<number>('REDIS_PORT'),
      password: configService.get<string>('REDIS_PASSWORD'),
    });
  }

  const sessionSecret =
    configService.get<string>('SESSION_SECRET') || 'default_secret_key';

  // 배포 환경인지 확인
  const isProduction = configService.get('NODE_ENV') === 'production';

  // [중요!] 쿠키 도메인 설정 (새로고침 로그아웃 방지 핵심)
  // 예: 도메인이 jincheon.net 이라면 '.jincheon.net' (앞에 점 필수!)
  // 로컬(개발)에서는 undefined로 둬야 작동합니다.
  const cookieDomain = isProduction ? '.내도메인.com' : undefined;

  app.use(
    session({
      store: new RedisStore({
        client: redisClient,
        prefix: 'sess:',
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,

      proxy: true,

      cookie: {
        httpOnly: true,
        secure: isProduction,
        // [수정] 도메인을 일치(.내도메인.com)시켰으므로 'lax'를 써도 공유가 됩니다. (더 안정적)
        sameSite: isProduction ? 'lax' : 'lax',

        // [핵심] 여기에 위에서 만든 도메인 변수를 넣습니다.
        domain: cookieDomain,

        maxAge: 1000 * 60 * 60 * 24, // 1일
      },
    }),
  );

  await app.listen(configService.get<number>('PORT') || 3050);
}
bootstrap();
