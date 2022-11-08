import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/orders.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersController } from './controllers/orders.controller';
import { OrdersService } from './services/orders.service';

import { Product } from 'src/products/entities/product.entity';
import { User } from 'src/users/users.entity';
import { Customer } from 'src/customers/entities/customers.entity';
import { Store } from '../stores/stores.entity'
import { OrdersListController } from './controllers/order-list.controller';
import { OrderListService } from './services/order-list.service';
import { Package } from '../package/package.entity'
import { Transaction } from '../transaction/transaction.entity'
import { Booking } from '../bookings/entities/bookings.entity'
import { ExportService } from './services/export.service';
import { ExportOrdersController } from './controllers/export.controller';
import { Credit } from '../credit/entities/credit.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, User, Customer, Store, Package, Transaction, Booking, Credit])],
  controllers: [OrdersController, OrdersListController, ExportOrdersController],
  providers: [OrdersService, OrderListService, ExportService]
})
export class OrdersModule {}
