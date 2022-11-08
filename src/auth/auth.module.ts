import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersService } from '../users/users.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { CustomersModule } from 'src/customers/customers.module';
import { JwtModule } from '@nestjs/jwt';
import { JsonWebTokenStrategy } from './strategies/jwt-strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PassportModule } from '@nestjs/passport';
import { User } from '../users/users.entity'
import { Store } from '../stores/stores.entity'
import { Order } from 'src/orders/entities/orders.entity';
import { Customer } from 'src/customers/entities/customers.entity';
import * as dotenv from 'dotenv';
import { CustomersService } from 'src/customers/customers.service';
import { Booking } from 'src/bookings/entities/bookings.entity';
import { Package } from 'src/package/package.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
dotenv.config();

@Module({
  imports: [
    UsersModule,
    CustomersModule,
    TypeOrmModule.forFeature([User, Store, Customer, Order, Booking, Package, OrderItem]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET_KEY,
      signOptions: { expiresIn: process.env.EXPIRES_TIME },
    }),
  ],
  providers: [AuthService, UsersService, CustomersService, LocalStrategy, JsonWebTokenStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
