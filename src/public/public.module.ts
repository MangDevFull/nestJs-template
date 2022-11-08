import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { User } from 'src/users/users.entity';
import { Order } from "src/orders/entities/orders.entity"
import { Transaction } from 'src/transaction/transaction.entity';
import { Store } from "src/stores/stores.entity"
import { Customer } from 'src/customers/entities/customers.entity';
import { OrderItem } from "src/orders/entities/order-item.entity"
import { Package } from 'src/package/package.entity'
import { Category } from "src/products/entities/category.entity";
import { Product } from 'src/products/entities/product.entity';
import { WebHookCustomer } from "./webhook.service"
import { BullModule } from '@nestjs/bull';
@Module({
  imports: [TypeOrmModule.forFeature([User, Order, Transaction, Store, Customer, OrderItem, Package, Category, Product]),
   BullModule.registerQueue({
    name: 'webhook', limiter: {
      max: 20,
      duration: 1000,
    }
  }),
  BullModule.registerQueue({
    name: 'webhook-we', limiter: {
      max: 100,
      duration: 1000,
    }
  })
],
  providers: [PublicService, WebHookCustomer],
  controllers: [PublicController],
})

export class PublicModule { }
