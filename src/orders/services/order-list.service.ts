import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, Brackets } from 'typeorm';
import { format, startOfDay, endOfDay } from 'date-fns'

import { Order } from '../entities/orders.entity'
import { UpdateOrderDto } from '../dto/update-order.dto';

import * as helper from '../../helpers/response';
import { User } from '../../users/users.entity'
import { Store } from '../../stores/stores.entity'
import { Customer } from '../../customers/entities/customers.entity';
import { OrderListParam } from 'src/orders/interface/order.interfaces';
import { OrderItem } from '../entities/order-item.entity'
import { Package } from '../../package/package.entity'
import * as constant from '../constant/constant';
import { Transaction } from '../../transaction/transaction.entity'
import { Credit } from '../../credit/entities/credit.entity'
import async from "async"


let _ = require('lodash');

@Injectable()
export class OrderListService {
    constructor(
        @InjectRepository(Order)
        private readonly orderRepo: Repository<Order>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,

        @InjectRepository(Store)
        private readonly storeRepo: Repository<Store>,

        @InjectRepository(Customer)
        private readonly customerRepo: Repository<Customer>,

        @InjectRepository(OrderItem)
        private readonly orderItemRepo: Repository<OrderItem>,

        @InjectRepository(Package)
        private readonly packageRepo: Repository<Package>,

        @InjectRepository(Transaction)
        private readonly transactionRepo: Repository<Transaction>,

        @InjectRepository(Credit)
        private readonly creditRepo: Repository<Credit>,
    ) { }

    async getAllOrders(
        param: OrderListParam,
        id_store: number) {
        try {
            var statusFilter = true;
            let newDate = new Date
            var start = new Date(newDate.setHours(0, 0, 0, 0))
            var end = new Date(newDate.setHours(0, 0, 0, 0))
            end.setDate(end.getDate() + 1);
            const takeRecord = param.take || 10;
            const paginate = param.page || 1;
            const skip = (paginate - 1) * takeRecord;
            let query = this.orderRepo.createQueryBuilder('order')
                .where("order.soft_delete IS NULL")
                .innerJoinAndSelect("order.stores", "stores")
                .innerJoinAndSelect("order.customers", "customers")
                .leftJoinAndSelect("order.User", "User")
                .leftJoinAndSelect("order.updatedBy", "updatedBy")
                .leftJoinAndSelect("order.transaction", "transaction")
                .orderBy('order.order_at', 'DESC')
                .orderBy('stores.id', 'DESC')

            if (param.store_ids) {
                var storeIds = param.store_ids.split(',')
                query = query.andWhere("order.store_id IN (:...ids)", { ids: storeIds })
            } else {
                query = query.andWhere("order.store_id like :storeId", { storeId: id_store })
            }
            
            if (param.keyword && typeof param.keyword) {
                statusFilter = false
                query = query.andWhere(new Brackets(qb => {
                    qb.where("customers.full_name like :full_name", { full_name: `%${param.keyword}%` })
                        .orWhere("customers.email like :email", { email: `%${param.keyword}%` })
                        .orWhere("customers.mobile like :mobile", { mobile: `%${param.keyword}%` })
                }))
            }

            if (param.code && typeof param.code) {
                statusFilter = false
                query = query.andWhere("order.order_code like :orderCode", { orderCode: `%${param.code}%` })
            }
            if (param.status && typeof param.status && param.status != 0) {
                statusFilter = false
                query = query.andWhere("order.status = :status", { status: param.status })
            }
            if (param.createdBy && typeof param.createdBy && param.createdBy != 0) {
                statusFilter = false
                query = query.andWhere("order.created_by = :createdBy", { createdBy: param.createdBy })
            }

            if (param.description && typeof param.description) {
                statusFilter = false
                query = query.andWhere("order.description like :description", { description: `%${param.description}%` })
            }
            if (param.owed_type && typeof param.owed_type) {
                statusFilter = false
                if (param.owed_type == 1) {
                    query = query.andWhere("order.money_owed IS NOT NULL").andWhere("order.money_owed > 0")
                        .andWhere("order.status != 1")
                }
                if (param.owed_type == 2) {
                    query = query.andWhere(new Brackets(qb => {
                        qb.where("order.money_owed IS NULL")
                            .orWhere("order.money_owed = 0")
                    }))
                }
            }

            if (param.start && typeof param.start && param.end && typeof param.end) {
                statusFilter = true
                start = new Date(param.start)
                end = new Date(param.end)
            }

            if (statusFilter) {
                query = query.andWhere(
                    'order.order_at BETWEEN :start_at AND :end_at',
                    { start_at: startOfDay(start), end_at: endOfDay(end) })
            }

            var countTotal = await query.getCount()

            query = query.take(takeRecord).skip(skip)

            var res = await query.getMany();

            var totalPricesQuery =  this.orderRepo.createQueryBuilder('order')
                    .where("order.soft_delete IS NULL")
                    .andWhere("order.status != 2")
                    .andWhere("order.order_at BETWEEN :start_at AND :end_at", { start_at: startOfDay(start), end_at: endOfDay(end) })
                    if (param.store_ids) {
                        var storeIds = param.store_ids.split(',')
                        totalPricesQuery = totalPricesQuery.andWhere("order.store_id IN (:...ids)", { ids: storeIds })
                    } else {
                        totalPricesQuery = totalPricesQuery.andWhere("order.store_id like :storeId", { storeId: id_store })
                    }

            var totalPrices = await totalPricesQuery.select('SUM(order.total_price) as totalPrices, SUM(order.money_owed) as totalOwed, SUM(order.deposit_total) as depositTotal').getRawOne()
            var data = {
                "itemCount": countTotal,
                "data": res,
                "takeRecord": takeRecord,
                "totalPrices": totalPrices.totalPrices - totalPrices.depositTotal,
                "totalOwed": totalPrices.totalOwed,
            }

            return helper.success(data);
        } catch (error) {
            return helper.error(error, "order-list.service")
        }
    }

    async getOrderItemByOrder(id: number) {
        try {
            let dataOder = await this.orderItemRepo.find(
                {
                    where: {
                        order: {
                            id: id
                        },
                    },
                    relations: {
                        product: true,
                        package: true,
                    }
                });

            dataOder.map((val, key) => {
                if (val.package) {
                    dataOder[key]["max_used"] = val.package.max_used,
                        dataOder[key]["count_used"] = val.package.count_used
                }
            })
            return helper.success(dataOder);
        } catch (error) {
            return helper.error(error, "order-list.service")
        }
    }

    async changeStatusOrder(id: number, updateOrderDto: UpdateOrderDto) {
        try {
            let checkOrderExists = await this.orderRepo.findOne({ where: { id: id }, relations: ["customers"] });
            if (!checkOrderExists) return helper.notFound('Hóa đơn này không tồn tại');

            // Remove transaction
            let removeTransaction = await this.transactionRepo.createQueryBuilder('transaction')
                .where("order_id = :id", { id: id })
                .delete()
                .execute();

            // Edit Order    
            let res = await this.orderRepo.update(id, {
                status: updateOrderDto.status, 
                description: (updateOrderDto.status === 1) ? checkOrderExists.description : updateOrderDto.description, 
            })

            //Update package
            if (updateOrderDto.status === 1) await this.updatePackageWhenOrderEdit(id)
            if (updateOrderDto.status === 2) await this.updatePackageOrderCancel(id)
            

            //Remove Credit_history when edit order
            let getCreditHistory = await this.creditRepo.createQueryBuilder('credit_history')
            .where('credit_history.order_code = :order_code', {order_code: checkOrderExists.order_code})
            .getOne();

            await this.removeCreditHistory(getCreditHistory ? getCreditHistory.id : 0, checkOrderExists)

            return helper.success(true);
        } catch (error) {
            console.log(error)
            return helper.error(error, "order.service-list.editOrder")
        }
   }

   async removeCreditHistory(id: number, order: any) {
        try {
            let deposit_money = order.customers.deposit_money;
            if (order.isDeposit) deposit_money -= order.total_price;
            if (order.deposit_total > 0) deposit_money += order.deposit_total;

            let owe_money = order.customers.owe_money;
            if (order.money_owed > 0) owe_money -= order.money_owed

            await this.customerRepo.update(order.customers.id, { deposit_money: deposit_money, owe_money: owe_money })
            if (id != 0) await this.creditRepo.delete({ id: id });
        } catch (error) {
            console.log(error)
            return helper.error(error, "order.service-list.editOrder.removeCredit")
        }
  }

   async updatePackageWhenOrderEdit(orderId: number){
        let orderItem = []
        var packages = []
        var order = await this.orderRepo.findOne({where:{id: orderId}})
        var dataPackageFindByOrder = await this.packageRepo.find({
            where: {
                order_code: order.order_code
            }
        })

        orderItem = await this.orderItemRepo.find({
            where: {
                order: {
                    id: orderId
                }
            },
            relations: {
                package: true
            }
        })

        let listPackageCodeOrderItem = []
        if (orderItem.length > 0) {
            for (let element of orderItem) {
                if (element.package && element.price == 0 && !element.new_package ) {
                    element.package.count_used = element.package.count_used - element.quantity
                    listPackageCodeOrderItem.push(element.package.package_code)
                    if ( element.package.count_used <  element.package.max_used && element.package.status == 4) {
                        element.package.status =  1
                    }
                    packages.push(element.package)
                }
            };
        }


        if (dataPackageFindByOrder.length > 0) {
            for (let element of dataPackageFindByOrder) {
                for (let elementOrderItem of orderItem) {
                    if (elementOrderItem.package && elementOrderItem.price > 0 && elementOrderItem.new_package && element.package_code == elementOrderItem.package_code && element.count_used == 0) {
                        await this.orderItemRepo.update(elementOrderItem.id, {package_code: null, package: null})
                        element.soft_delete = new Date()
                        packages.push(element)
                    }
                    if (elementOrderItem.package && elementOrderItem.price > 0 && elementOrderItem.new_package && element.package_code == elementOrderItem.package_code && element.count_used > 0) {
                        await this.orderItemRepo.update(elementOrderItem.id, {package_code: null})
                        element.status = 2
                        packages.push(element)
                    }
                };
                if (!listPackageCodeOrderItem.includes(element.package_code) && element.count_used == 0) {
                    element.soft_delete = new Date()
                    packages.push(element)
                }
            }

        }


        await this.packageRepo.save(packages)
   }

   async updatePackageOrderCancel(orderId: number) {
        let orderItem = []
        var packages = []
        orderItem = await this.orderItemRepo.find({
            where: {
                order: {
                    id: orderId
                }
            },
            relations: {
                package: true
            }
        })

        if (orderItem.length > 0) {
            for (let element of orderItem) {
                if (element.package && element.price > 0) {
                    element.package.soft_delete = new Date()
                    packages.push(element.package)
                }
                if (element.package && element.price == 0) {
                    element.package.count_used =  element.package.count_used -  element.quantity
                    element.package.status = 1
                    packages.push(element.package)
                }
            };
        }
        this.packageRepo.save(packages)
    }
}