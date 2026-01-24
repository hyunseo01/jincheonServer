import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const allowedOrigins = new Set<string>([
    'https://www.jincheoncenter.com',
    'https://jincheoncenter.com',
    'https://jincheonweb-production.up.railway.app',
    'http://localhost:3000',
    'http://localhost:3050',
  ]);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials: false, // 쿠키 기반 아님
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
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

  const port = configService.get<number>('PORT') || 3050;
  await app.listen(port);
  console.log(`[Nest] listening on port ${port}`);
}

bootstrap().catch((e) => {
  console.error('Bootstrap failed:', e);
  process.exit(1);
});
