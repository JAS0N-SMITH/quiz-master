import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  // TODO: Add TransformInterceptor for response format standardization
  // See: src/common/interceptors/transform.interceptor.ts for details
  // This is a breaking change requiring frontend coordination
  // app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidUnknownValues: false }),
  );

  // CORS configuration with production validation
  const frontendUrl = process.env.FRONTEND_URL;
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && !frontendUrl) {
    throw new Error(
      'FRONTEND_URL environment variable is required in production',
    );
  }

  const allowedOrigins = frontendUrl
    ? frontendUrl.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(
    `API started on port ${port} (NODE_ENV=${process.env.NODE_ENV ?? 'development'})`,
  );
}
void bootstrap();
