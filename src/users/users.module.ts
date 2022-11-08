import { Store } from './../stores/stores.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service'
import { JwtService } from '@nestjs/jwt'
import {CustomersService} from "../customers/customers.service"
import { Customer } from 'src/customers/entities/customers.entity'
import { Order } from 'src/orders/entities/orders.entity';
import { Booking } from 'src/bookings/entities/bookings.entity';
import { Package } from 'src/package/package.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Store,Customer,Order,Booking,Package,OrderItem]),
  ],
  providers: [UsersService, AuthService, JwtService,CustomersService],
  controllers: [UsersController],
})
export class UsersModule {}
