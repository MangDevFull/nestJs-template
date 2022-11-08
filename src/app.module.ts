import { Module, } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { GraphQLModule } from '@nestjs/graphql';
import { ModuleV1 } from './v1/index.module';
import { RouterModule } from '@nestjs/core'
import * as dotenv from 'dotenv';


dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
    }),
    ModuleV1,
  ],
  providers: [],

})

export class AppModule { }
