import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportController } from './reports.controller';
import { User } from 'src/users/users.entity';
import { Order } from "src/orders/entities/orders.entity"
import { Transaction } from 'src/transaction/transaction.entity';
import {Store} from "src/stores/stores.entity"
import { Customer } from 'src/customers/entities/customers.entity';
import {OrderItem} from "src/orders/entities/order-item.entity"
import { Package } from 'src/package/package.entity';
import { Booking } from '../bookings/entities/bookings.entity'
import { Product } from 'src/products/entities/product.entity';
import { Category } from 'src/products/entities/category.entity';
import { ProductMeta } from 'src/products/entities/product-meta.entity';
import { Note } from 'src/notes/entities/notes.entity';


@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, User, Customer, Store, Package, Transaction, Booking, Category, ProductMeta, Note], process.env.DB_REPORT_CONNECT_NAME)],
  providers: [ReportsService],
  controllers: [ReportController],
})

export class ReportModule {}
