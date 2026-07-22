// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser'; // ✅ FIX: Default import for callable signature

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ CRITICAL: Enable cookie parsing for refresh token authentication
  app.use(cookieParser());

  app.enableCors({
    origin: ['http://localhost:3001', 'http://192.168.100.5:3001'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
  }));
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Backend is running on: http://localhost:${port}`);
}
bootstrap();