import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from 'src/customers/entities/customers.entity';
import { Product } from 'src/products/entities/product.entity';
import { Store } from '../stores/stores.entity';
import { Category } from 'src/products/entities/category.entity';
import { ProductMeta } from 'src/products/entities/product-meta.entity';
import { User } from 'src/users/users.entity';
import { Package } from 'src/package/package.entity';
import { Order } from 'src/orders/entities/orders.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { Transaction } from 'src/transaction/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Store, Product, Category, Product, ProductMeta, User, Package, Order, OrderItem, Transaction ])],
  controllers: [ImportController],
  providers: [ImportService]
})
export class ImportModule {}
