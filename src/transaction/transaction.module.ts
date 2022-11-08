import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity'; 
import { Order } from '../orders/entities/orders.entity'; 
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { Store } from 'src/stores/stores.entity';
import { Customer } from 'src/customers/entities/customers.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction,Order, Store, Customer])],
  controllers: [TransactionController],
  providers: [TransactionService]
})
export class TransactionModule {}
