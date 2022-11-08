import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/orders/entities/orders.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { OrdersController } from 'src/orders/controllers/orders.controller';
import { OrdersService } from 'src/orders/services/orders.service';

import { Product } from 'src/products/entities/product.entity';
import { User } from 'src/users/users.entity';
import { Customer } from 'src/customers/entities/customers.entity';
import { Store } from '../stores/stores.entity'

import { Package } from '../package/package.entity'
import { Transaction } from '../transaction/transaction.entity'
import { Booking } from '../bookings/entities/bookings.entity'
import { CronService } from './cron-customer-service';
import {cronOrderService} from './cron-order-service';
import { CronCustomerDebtService } from './cron-customer-debt-service';
import {CronOrderDetailService} from './cron-order-detail-service';
import { CronCustomerUsingService } from './cron-customer-using-service';
import {handleCronReportTransaction} from './cron-report-transaction';
import {handleCronReportCustomerUnrealizedRevenueReport} from './cron-customer-unrealized-revenue-report'
import { Category } from 'src/products/entities/category.entity';
import { ProductMeta } from 'src/products/entities/product-meta.entity';
import { Note } from 'src/notes/entities/notes.entity';




@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, User, Customer, Store, Package, Transaction, Booking, Category, ProductMeta, Note], process.env.DB_REPORT_CONNECT_NAME)],
  controllers: [],
  providers: [CronService, cronOrderService, CronCustomerDebtService, CronOrderDetailService, CronCustomerUsingService, handleCronReportTransaction, handleCronReportCustomerUnrealizedRevenueReport]
})
export class CronGoogleModule {}
