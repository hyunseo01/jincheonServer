import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

import cookieParser from 'cookie-parser';
import session from 'express-session';

// const RedisStore = require('connect-redis').default || require('connect-redis');
// import Redis from 'ioredis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

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

  // 쿠키 파서 적용
  app.use(cookieParser());

  // 레디스 클라이언트 생성
  // const redisClient = new Redis({
  //   host: configService.get<string>('REDIS_HOST'),
  //   port: configService.get<number>('REDIS_PORT'),
  // });

  // [중요 3] secret이 undefined일 수 있다는 에러 해결
  // get<string>으로 타입 명시하고, 만약 없으면 빈 문자열('')이라도 넣도록 처리
  const sessionSecret =
    configService.get<string>('SESSION_SECRET') || 'default_secret_key';

  // 세션 설정
  app.use(
    session({
      // store: new (RedisStore as any)({ client: redisClient }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
      },
    }),
  );

  await app.listen(configService.get<number>('PORT') || 3050);
}
bootstrap();
