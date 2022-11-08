import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/bookings.entity';
import { BookingController } from './controller/bookings.controller';
import { BookingService } from './service/bookings.service';
import { User } from '../users/users.entity'
import { Store } from '../stores/stores.entity';
import { Customer } from '../customers/entities/customers.entity';
import { UsersService } from '../users/users.service';
import {ExportBooking} from './controller/export.controller';
import {ExportBookingHistoryService} from './service/export-booking-history.service';
import { Order } from 'src/orders/entities/orders.entity';



@Module({
  imports: [TypeOrmModule.forFeature([Booking, User, Store, Customer, Order])],
  controllers: [BookingController, ExportBooking],
  providers: [BookingService, UsersService, ExportBookingHistoryService]
})
export class BookingsModule {}
