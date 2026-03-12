import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS for the web console / central server if they talk directly to HTTP API
  app.enableCors();

  const httpPort = process.env.HTTP_PORT || 3033;
  await app.listen(httpPort);
  console.log(`[LogServer] HTTP API running on port ${httpPort}`);
}
bootstrap();
