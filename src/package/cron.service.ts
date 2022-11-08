import { Injectable, Query } from '@nestjs/common';
import { Package } from './package.entity'
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult, DeleteResult, NotBrackets, Brackets, MoreThan, LessThanOrEqual } from 'typeorm';
import * as helpers from '../helpers/response'
import { format, startOfDay, endOfDay } from 'date-fns'
import { PackageListParam } from './interface/package.interfaces';
import { Customer } from 'src/customers/entities/customers.entity';
import { Product } from 'src/products/entities/product.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class CronService {
    constructor(
        @InjectRepository(Package)
        private readonly packagesRepo: Repository<Package>,

        @InjectRepository(Customer)
        private readonly customerRepo: Repository<Customer>,
        @InjectRepository(Product)
        private readonly productRepo: Repository<Product>,
        @InjectRepository(OrderItem)
        private readonly orderItemRepo: Repository<OrderItem>,

    ) { }

    @Cron('0 20 * * *')
    handleCron() {
        var date = (new Date).setDate((new Date).getDate() + 2);
        var newDate = new Date(date)
        newDate.setHours(0, 0, 0, 0)
        this.packagesRepo.update(
            { 
                expiration_date: LessThanOrEqual(new Date(newDate)),
                status: 1
             },
            { status: 3 }
        )
        console.log("cron_true")
    }

}
