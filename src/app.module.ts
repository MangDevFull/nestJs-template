import { Module, } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { GraphQLModule } from '@nestjs/graphql';
import { UsersModule } from './users/users.module';
import { StoresModule } from './stores/stores.module';
import { CustomersModule } from './customers/customers.module';
import { ProductsModule } from './products/product.module'
import { BookingsModule } from './bookings/bookings.module';
import { AuthModule } from './auth/auth.module';
import { PackageModule } from './package/pakage.module';
import { TransactionModule } from './transaction/transaction.module';
import { ImportModule } from './import/import.module';
import { OrdersModule } from './orders/orders.module';
import { NoteModule } from "./notes/notes.module"
import { ReportModule } from './reports/reports.module';
import { CreditModule } from './credit/credit.module';
import { PublicModule } from './public/public.module'
import * as dotenv from 'dotenv';
import { CronGoogleModule } from './cron-googlesheet/cron.module';
import { User } from 'src/users/users.entity';
import { Order } from "src/orders/entities/orders.entity"
import { Transaction } from 'src/transaction/transaction.entity';
import {Store} from "src/stores/stores.entity"
import { Customer } from 'src/customers/entities/customers.entity';

import { Booking } from 'src/bookings/entities/bookings.entity';
import { MessageConsumer } from "src/public/consumer-webhook"
import { MessageConsumerWe } from "src/public/consumer-webhook-we"
import { BullModule } from '@nestjs/bull';

import {OrderItem} from "src/orders/entities/order-item.entity"
import { Package } from 'src/package/package.entity'
import { Category } from "src/products/entities/category.entity";
import { Product } from 'src/products/entities/product.entity';


dotenv.config();

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.HOST_REDIS,
        port: parseInt(process.env.PORT_REDIS),
      },
    }),

    TypeOrmModule.forFeature([User, Order, Transaction, Store, Customer, OrderItem, Package, Category, Product, Booking]),

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
    TypeOrmModule.forRoot({
      name: process.env.DB_REPORT_CONNECT_NAME,
      type: 'mysql',
      host: process.env.DB_REPORT_HOST,
      port: 3306,
      username: process.env.DB_REPORT_USERNAME,
      password: process.env.DB_REPORT_PASSWORD,
      database: process.env.DB_REPORT_NAME,
      synchronize: true,
      autoLoadEntities: true,
    }),
    UsersModule,
    StoresModule,
    CustomersModule,
    ProductsModule,
    BookingsModule,
    AuthModule,
    OrdersModule,
    PackageModule,
    TransactionModule,
    ImportModule,
    NoteModule,
    ReportModule,
    CreditModule,
    PublicModule,
    // CronGoogleModule,
  ],
  providers: [ MessageConsumer, MessageConsumerWe],

})

export class AppModule { }
