import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import * as dotenv from 'dotenv';
import { UsersService } from "./src/v1/users/users.service"
dotenv.config();

async function bootstrap() {
    try {
        const application = await NestFactory.createApplicationContext(AppModule);
        // Add migration code here
        const data = await application.get(UsersService).getUser()
        console.log("data", data)
        await application.close();
        process.exit(0);
    } catch (error) {
        console.log(error)
    }
}

bootstrap();
