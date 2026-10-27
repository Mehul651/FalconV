import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded, type NextFunction, type Request, type Response } from 'express';
import { toNodeHandler } from 'better-auth/node';
import helmet from 'helmet';
import { auth } from './auth/auth';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(helmet());
  app.use('/api/auth', toNodeHandler(auth));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.startsWith('/api/auth')) {
      next();
      return;
    }
    const contentType = req.headers['content-type'] ?? '';
    if (contentType.includes('multipart/form-data')) {
      next();
      return;
    }
    json({ limit: '2mb' })(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }
      urlencoded({ extended: true })(req, res, next);
    });
  });
  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const swagger = new DocumentBuilder()
    .setTitle('FalconV API')
    .setDescription('Enterprise business operations platform API')
    .setVersion('0.1.0')
    .addCookieAuth('better-auth.session_token')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.API_PORT ?? 3001);
  await app.listen(port);
  Logger.log(`FalconV API listening on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
