import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

import cookieParser from 'cookie-parser';
import session from 'express-session';

import connectRedis from 'connect-redis';
import { createClient } from 'redis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const expressApp = app.getHttpAdapter().getInstance();

  // Cloudflare + Railway 프록시 신뢰 (secure cookie 필수)
  expressApp.set('trust proxy', true);

  // CORS 허용 오리진
  const allowedOrigins = new Set<string>([
    'https://www.jincheoncenter.com',
    'https://jincheoncenter.com',
    'https://jincheonweb-production.up.railway.app',
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      // 서버-서버 요청/curl 등 origin 없는 경우 허용
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

  // Redis (공식 redis client)
  const redisUrl = configService.get<string>('REDIS_URL');
  if (!redisUrl) {
    throw new Error('REDIS_URL is missing');
  }

  const redisClient = createClient({ url: redisUrl });
  redisClient.on('error', (err) => console.error('[Redis] client error:', err));
  await redisClient.connect();

  const sessionSecret =
    configService.get<string>('SESSION_SECRET') || 'default_secret_key';

  // connect-redis@6 방식 (TS/ESM 꼬임 가장 안정적)
  const RedisStore = connectRedis(session);

  app.use(
    session({
      store: new RedisStore({
        client: redisClient as any,
        prefix: 'sess:',
      }),
      name: 'connect.sid',
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      proxy: true,
      cookie: {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.jincheoncenter.com',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24, // 1일
      },
    }),
  );

  const port = configService.get<number>('PORT') || 3050;
  await app.listen(port);
  console.log(`[Nest] listening on port ${port}`);
}

bootstrap().catch((e) => {
  console.error('Bootstrap failed:', e);
  process.exit(1);
});
