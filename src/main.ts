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

  const allowedOrigins = new Set([
    'https://www.jincheoncenter.com',
    'https://jincheoncenter.com',
    'https://jincheonweb-production.up.railway.app',
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      // 서버-서버 요청이나 curl은 origin이 없을 수 있음
      if (!origin) return callback(null, true);

      if (allowedOrigins.has(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked: ${origin}`), false);
    },
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
        secure: true,
        sameSite: 'none',
        domain: '.jincheoncenter.com',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24,
      },
    }),
  );

  await app.listen(configService.get<number>('PORT') || 3050);
}
bootstrap();
