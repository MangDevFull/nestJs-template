import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Package } from './package.entity';
import { PackageController } from './package.controller';
import { PackageService } from './package.service';
import { Customer } from 'src/customers/entities/customers.entity';
import { Product } from 'src/products/entities/product.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './cron.service';
import { Credit } from 'src/credit/entities/credit.entity'
import {ExportPackageController} from './export.controller'
import {ExportService} from './export.service'



@Module({
  imports: [
    TypeOrmModule.forFeature([Package, Customer, Product, OrderItem, Credit]),
    ScheduleModule.forRoot()
  ],
  controllers: [PackageController, ExportPackageController],
  providers: [PackageService, CronService, ExportService]
})
export class PackageModule {}
