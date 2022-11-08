import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customers.entity';
import { Store } from '../stores/stores.entity';
import { Order } from 'src/orders/entities/orders.entity';
import { Booking } from 'src/bookings/entities/bookings.entity';
import { Package } from 'src/package/package.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { ExportService } from './export.service'
import { ExportController } from './export.controller';


@Module({
  imports: [TypeOrmModule.forFeature([Customer, Store, Order, Booking, Package, OrderItem])],
  controllers: [CustomersController, ExportController],
  providers: [CustomersService, ExportService]
})
export class CustomersModule {}
