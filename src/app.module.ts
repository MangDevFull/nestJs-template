import { Module, } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { GraphQLModule } from '@nestjs/graphql';
import { AuthModule } from './auth/auth.module';
import * as dotenv from 'dotenv';


dotenv.config();

@Module({
  imports: [
    // BullModule.forRoot({
    //   redis: {
    //     host: process.env.HOST_REDIS,
    //     port: parseInt(process.env.PORT_REDIS),
    //   },
    // }),

    // TypeOrmModule.forFeature([User, Order, Transaction, Store, Customer, OrderItem, Package, Category, Product, Booking]),

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
    AuthModule,
  ],
  providers: [],

})

export class AppModule { }
