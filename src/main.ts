import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { authMiddleware } from './middleware/auth.middleware';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  /* Cors */
  let whitelist = ["http://192.168.110.143:3000","http://192.168.111.143:3000",'http://localhost:8088',
  'https://test.cent.beauty','http://localhost:3000', 'https://we.centhappy.com', 'http://14.225.36.48:8082'];
  app.enableCors({
    origin: function (origin, callback) {
      if (!origin || whitelist.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
  });

  /* Middleware */
  app.use(authMiddleware);
  

  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT);
  console.log(`Application is running on: ${await app.getUrl()}`);
}

bootstrap();
