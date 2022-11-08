import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credit } from './entities/credit.entity';
import { CreditController } from './controller/credit.controller';
import { CreditService } from './service/credit.service';
import { User } from '../users/users.entity'
import { Store } from '../stores/stores.entity';
import { Customer } from '../customers/entities/customers.entity';
import { Package } from '../package/package.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Credit, Store, Customer, Package])],
  controllers: [CreditController],
  providers: [CreditService]
})
export class CreditModule {}
