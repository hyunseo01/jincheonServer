import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

import cookieParser from 'cookie-parser';
import session from 'express-session';
import Redis from 'ioredis';
import { RedisStore } from 'connect-redis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const expressApp = app.getHttpAdapter().getInstance();

  // [1] Cloudflare + Railway 환경에서 프록시 신뢰 필수
  expressApp.set('trust proxy', true);

  app.enableCors({
    // 프론트엔드 도메인을 명시하거나 true로 설정
    origin: ['https://www.jincheoncenter.com'],
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

  // [2] Redis 연결
  const redisUrl = configService.get<string>('REDIS_URL');
  const redisClient = redisUrl
    ? new Redis(redisUrl)
    : new Redis({
        host: configService.get<string>('REDIS_HOST'),
        port: configService.get<number>('REDIS_PORT'),
        password: configService.get<string>('REDIS_PASSWORD'),
      });

  const sessionSecret =
    configService.get<string>('SESSION_SECRET') || 'default_secret_key';
  const isProduction = configService.get('NODE_ENV') === 'production';

  app.use(
    session({
      store: new RedisStore({
        client: redisClient,
        prefix: 'sess:',
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      proxy: true, // [중요] 보안 쿠키 전송을 위해 필수
      cookie: {
        httpOnly: true,
        // [수정] 배포 환경에서는 무조건 true, 로컬은 환경변수에 따라 대응
        secure: isProduction,

        // [핵심] 크로스 도메인(www <-> api) 간 가장 확실한 설정
        // isProduction이 true일 때 'none', 아니면 'lax'
        sameSite: isProduction ? 'none' : 'lax',

        // [핵심] 앞에 점(.) 포함된 정확한 도메인
        domain: isProduction ? '.jincheoncenter.com' : undefined,

        maxAge: 1000 * 60 * 60 * 24, // 1일
      },
    }),
  );

  await app.listen(configService.get<number>('PORT') || 3050);
}
bootstrap();
