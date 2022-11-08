import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, Between, In } from 'typeorm';
import { User } from 'src/users/users.entity';
import { Order } from "src/orders/entities/orders.entity"
import { Store } from "src/stores/stores.entity"
import * as helper from '../helpers/response'
import { Transaction } from 'src/transaction/transaction.entity';
import { QueryReport } from './interfaces/query.interface';
let _ = require('lodash');
import { startOfDay, endOfDay } from 'date-fns'
import async from "async"
import { Customer } from 'src/customers/entities/customers.entity';
import { OrderItem } from "src/orders/entities/order-item.entity"
import { Package } from 'src/package/package.entity';
import {
    paginate,
} from 'nestjs-typeorm-paginate';
import { compareSync } from 'bcrypt';
@Injectable()
export class ReportsService {
    constructor(
        @InjectRepository(User, process.env.DB_REPORT_CONNECT_NAME)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Order, process.env.DB_REPORT_CONNECT_NAME)
        private readonly orderRepository: Repository<Order>,
        @InjectRepository(Transaction, process.env.DB_REPORT_CONNECT_NAME)
        private readonly transactionRepository: Repository<Transaction>,
        @InjectRepository(Store, process.env.DB_REPORT_CONNECT_NAME)
        private readonly storeRepository: Repository<Store>,
        @InjectRepository(Customer, process.env.DB_REPORT_CONNECT_NAME)
        private readonly customerRepository: Repository<Customer>,
        @InjectRepository(OrderItem, process.env.DB_REPORT_CONNECT_NAME)
        private readonly orderItemRepository: Repository<OrderItem>,
        @InjectRepository(Package, process.env.DB_REPORT_CONNECT_NAME)
        private readonly packageRepository: Repository<Package>,
    ) { }
    async CountDaily(query: QueryReport) {
        try {
            const { store, startDate, endDate } = query
            return async.parallel({
                totalAmountReceipt: (cb) => {
                    async.parallel({
                        totalByOrder: (cb) => {
                            let query = this.orderRepository
                            .createQueryBuilder("order")
                            .where('order.soft_delete IS NULL')
                            .andWhere('order.status = 3')

                            if (store == 0) {
                                query
                                    .select("SUM(order.total_price)", "sum_total_price")
                                    .addSelect("SUM(order.money_owed)", "sum_money_owed")
                                    .addSelect("SUM(order.deposit_total)", "sum_deposit_total")
                            } else {
                                query
                                    .select("SUM(order.total_price)", "sum_total_price")
                                    .addSelect("SUM(order.money_owed)", "sum_money_owed")
                                    .addSelect("SUM(order.deposit_total)", "sum_deposit_total")
                                    .andWhere("order.store_id = :id", { id: store })
                                    .leftJoinAndSelect("order.stores", "store_id")
                                    .groupBy("order.store_id")
                            }
                            query.andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                                .getRawMany().then(rs => {
                                    cb(null, rs[0])
                                })
                        },
                        revenueByOrder: (cb) => {
                            let data = this.transactionRepository.createQueryBuilder("transaction")
                            .where("transaction.paid_amount > 0")
                            .andWhere("transaction.pay_type NOT IN (:...pay_type)", { pay_type: ["Sử dụng cọc"] })
                            .andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                            .andWhere("order.status = 3")
                            .andWhere('transaction.soft_delete IS NULL')
                            .andWhere("transaction.status = 1")
                            .leftJoinAndSelect("transaction.order", "order")
                            if (store != 0) data.andWhere("order.store_id = :id", { id: store })
                            data.getRawMany()
                            .then(rs => {
                                const result = _.sumBy(rs, function (o) { return o.transaction_paid_amount });
                                cb(null, result)
                            })
                        },
                        revenueByOwed: (cb) => {
                            let data = this.transactionRepository.createQueryBuilder("transaction")
                            .where("transaction.paid_amount > 0")
                            .andWhere("transaction.status = 2")
                            .andWhere('transaction.created_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                            .andWhere('transaction.soft_delete IS NULL')
                            .leftJoinAndSelect("transaction.order", "order")
                            if (store != 0) data.andWhere("transaction.store_id = :id", { id: store })
                            data.getRawMany()
                            .then(rs => {
                                const result = _.sumBy(rs, function (o) { return o.transaction_paid_amount });
                                cb(null, result)
                            })
                        },
                    }).then(rs => cb(null, rs))
                },
                ordersByDays: (cb) => {
                    async.parallel({
                        order: (cb) => {
                            let query = {}
                            if (store != 0) {
                                query = {
                                    ...query,
                                    stores: {
                                        id: store
                                    },
                                }
                            }
                            this.orderRepository.find({
                                where: {
                                    ...query,
                                    order_at: Between(startOfDay(new Date(startDate)), endOfDay(new Date((endDate)))),
                                    soft_delete: IsNull(),
                                },
                                relations: {
                                    stores: true
                                },
                                order: {
                                    order_at: "DESC"
                                }
                            }).then(rs => {
                                cb(null, rs)
                            })
                        },
                        transaction: (cb) => {
                            let query = this.transactionRepository.createQueryBuilder("transaction")
                                .select(["transaction.paid_amount", "transaction.created_at"])
                                .where("transaction.status = :status", { status: 2 })
                                .andWhere('transaction.soft_delete IS NULL')
                                .andWhere('transaction.created_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                            
                            if (store != 0) query.andWhere("transaction.store_id = :id", { id: store })
                            
                            query.getRawMany().then(rs => {
                                cb(null, rs)
                            })
                        },
                        revenueOrder: (cb) => {
                            let query = this.transactionRepository.createQueryBuilder("transaction")
                                .select(["transaction.paid_amount", "transaction.created_at"])
                                .where("transaction.status = :status", { status: 1 })
                                .andWhere("transaction.paid_amount > 0")
                                .andWhere("transaction.pay_type NOT IN (:...pay_type)", { pay_type: ["Sử dụng cọc"] })
                                .andWhere('transaction.soft_delete IS NULL')
                                .andWhere('order.status = 3')
                                .andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                                .leftJoinAndSelect("transaction.order", "order")
                            if (store != 0) query.andWhere("order.store_id = :id", { id: store })
                            
                            query.getRawMany().then(rs => {
                                cb(null, rs)
                            })
                        }
                    }).then(rs => cb(null, rs))
                },
                totalOrders: (cb) => {
                    let query = {}
                    if (store != 0) {
                        query = {
                            ...query,
                            stores: {
                                id: store
                            },
                        }
                    }
                    this.orderRepository.count({
                        where: {
                            ...query,
                            order_at: Between(startOfDay(new Date(startDate)), endOfDay(new Date((endDate)))),
                            soft_delete: IsNull()
                        },
                        relations: {
                            stores: true
                        }
                    }).then(rs => cb(null, rs))
                },
                payByCash: (cb) => {
                    async.parallel({
                        total: (cb) => {
                            let query = this.transactionRepository.createQueryBuilder("transaction")
                                .where("transaction.pay_type = :pay_type", { pay_type: "Tiền mặt" })
                                .andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                                .andWhere("transaction.status = :status", { status: 1 })
                                .andWhere('transaction.soft_delete IS NULL')
                                .andWhere("order.status = 3")
                                .leftJoinAndSelect("transaction.order", "order")

                            if (store != 0) query.andWhere("order.store_id = :id", { id: store })
                            
                            query.getRawMany().then(rs => {
                                const result = _.sumBy(rs, function (o) { return o.transaction_paid_amount });
                                cb(null, result)
                            })
                        },
                        owed: (cb) => {
                            let query = this.transactionRepository.createQueryBuilder("transaction")
                                .where("transaction.pay_type = :pay_type", { pay_type: "Tiền mặt" })
                                .andWhere("transaction.status = :status", { status: 2 })
                                .andWhere('transaction.soft_delete IS NULL')
                                .andWhere('transaction.created_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                            
                            if (store != 0) query.andWhere("transaction.store_id = :id", { id: store })
                            
                            query.getRawMany().then(rs => {
                                const result = _.sumBy(rs, function (o) { return o.transaction_paid_amount });
                                cb(null, result)
                            })
                        }
                    }).then(rs => cb(null, rs))
                },
                payCredit: (cb) => {
                    async.parallel({
                        total: (cb) => {
                            let query = this.transactionRepository.createQueryBuilder("transaction")
                                .where("transaction.pay_type IN (:...pay_type)", { pay_type: ["Chuyển khoản", "Quẹt thẻ"] })
                                .andWhere('transaction.soft_delete IS NULL')
                                .andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                                .andWhere("transaction.status = :status", { status: 1 })
                                .andWhere("order.status = 3")
                                .leftJoinAndSelect("transaction.order", "order");

                            if (store != 0) query.andWhere("order.store_id = :id", { id: store })
                            
                            query.getRawMany().then(rs => {
                                    const result = _.sumBy(rs, function (o) { return o.transaction_paid_amount });
                                    cb(null, result)
                                })
                        },
                        owed: (cb) => {
                            let query = this.transactionRepository.createQueryBuilder("transaction")
                                .where("transaction.pay_type IN (:...pay_type)", { pay_type: ["Chuyển khoản", "Quẹt thẻ"] })
                                .andWhere('transaction.soft_delete IS NULL')
                                .andWhere('transaction.created_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                                .andWhere("transaction.status = :status", { status: 2 });

                            if (store != 0) query.andWhere("transaction.store_id = :id", { id: store })
                            
                            query.getRawMany().then(rs => {
                                const result = _.sumBy(rs, function (o) { return o.transaction_paid_amount });
                                cb(null, result)
                            })
                        }
                    }).then(rs => cb(null, rs))
                }
            }).then(rs => {
                return helper.success(rs)
            })
        } catch (error) {
            return helper.error(error)
        }
    }
    async CountLocation(query: QueryReport) {
        try {
            const { startDate, endDate } = query
            return async.parallel({
                totalReceipt: (cb) => {
                    async.parallel({
                        totalByOrder: (cb) => {
                            this.orderRepository
                            .createQueryBuilder("order")
                            .where('order.soft_delete IS NULL')
                            .andWhere("order.status = 3")
                            .select("SUM(order.total_price)", "sum_total_price")
                            .addSelect("SUM(order.deposit_total)", "sum_deposit_total")
                            .andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                            .getRawMany()
                            .then(rs => {
                                cb(null, rs[0])
                            })
                        },
                        revenueByOrder: (cb) => {
                            let data = this.transactionRepository.createQueryBuilder("transaction")
                            .where("transaction.paid_amount > 0")
                            .andWhere("transaction.pay_type NOT IN (:...pay_type)", { pay_type: ["Sử dụng cọc"] })
                            .andWhere("order.status = 3")
                            .andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                            .andWhere('transaction.soft_delete IS NULL')
                            .andWhere("transaction.status = 1")
                            .leftJoinAndSelect("transaction.order", "order")
                            .getRawMany()
                            .then(rs => {
                                const result = _.sumBy(rs, function (o) { return o.transaction_paid_amount });
                                cb(null, result)
                            })
                        },
                        revenueByOwed: (cb) => {
                            let data = this.transactionRepository.createQueryBuilder("transaction")
                            .where("transaction.paid_amount > 0")
                            .andWhere("transaction.pay_type NOT IN (:...pay_type)", { pay_type: ["Sử dụng cọc"] })
                            .andWhere("transaction.status = 2")
                            .andWhere('transaction.soft_delete IS NULL')
                            .andWhere('transaction.created_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                            .getRawMany()
                            .then(rs => {
                                const result = _.sumBy(rs, function (o) { return o.transaction_paid_amount });
                                cb(null, result)
                            })
                        }
                    }).then(rs => cb(null, rs))
                },
                receiptByCash: (cb) => {
                    async.parallel({
                        total: (cb) => {
                            this.transactionRepository
                                .createQueryBuilder("transaction")
                                .where("transaction.paid_amount > 0")
                                .andWhere("transaction.pay_type = :pay_type", { pay_type: "Tiền mặt" })
                                .andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                                .andWhere("order.status = 3")
                                .andWhere('transaction.soft_delete IS NULL')
                                .leftJoinAndSelect("transaction.order", "order")
                                .getRawMany().then(rs => {
                                    const result = _.sumBy(rs, function (o) { return o.transaction_paid_amount });
                                    cb(null, result)
                                })
                        },
                        owed: (cb) => {
                            this.transactionRepository
                                .createQueryBuilder("transaction")
                                .where("transaction.paid_amount > 0")
                                .andWhere("transaction.pay_type = :pay_type", { pay_type: "Tiền mặt" })
                                .andWhere("transaction.status = :status", { status: 2 })
                                .andWhere('transaction.soft_delete IS NULL')
                                .andWhere('transaction.created_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                                .andWhere('order.order_at NOT BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                                .leftJoinAndSelect("transaction.order", "order")
                                .getRawMany().then(rs => {
                                    const result = _.sumBy(rs, function (o) { return o.transaction_paid_amount });
                                    cb(null, result)
                                })
                        }
                    }).then(rs => cb(null, rs))
                },
                receiptByCredit: (cb) => {
                    async.parallel({
                        total: (cb) => {
                            let query = this.transactionRepository.createQueryBuilder("transaction")
                                .where("transaction.paid_amount > 0")
                                .andWhere("transaction.pay_type IN (:...pay_type)", { pay_type: ["Chuyển khoản", "Quẹt thẻ"] })
                                .andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                                .andWhere("order.status = 3")
                                .andWhere("transaction.status = 1")
                                .andWhere('transaction.soft_delete IS NULL')
                                .leftJoinAndSelect("transaction.order", "order")
                                .getRawMany().then(rs => {
                                    const result = _.sumBy(rs, function (o) { return o.transaction_paid_amount });
                                    cb(null, result)
                                })
                        },
                        owed: (cb) => {
                            let query = this.transactionRepository.createQueryBuilder("transaction")
                                .where("transaction.paid_amount > 0")
                                .andWhere("transaction.pay_type IN (:...pay_type)", { pay_type: ["Chuyển khoản", "Quẹt thẻ"] })
                                .andWhere("transaction.status = 2")
                                .andWhere('transaction.soft_delete IS NULL')
                                .andWhere('transaction.created_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                                .leftJoinAndSelect("transaction.order", "order")
                                .getRawMany().then(rs => {
                                    const result = _.sumBy(rs, function (o) { return o.transaction_paid_amount });
                                    cb(null, result)
                                })
                        }
                    }).then(rs => cb(null, rs))
                },
                data: (cb) => {
                    async.parallel({
                        revenueByOrder: (cb) => {
                            let data = this.transactionRepository.createQueryBuilder("transaction")
                            .where("transaction.paid_amount > 0")
                            .andWhere("transaction.status = 1")
                            .andWhere("transaction.pay_type NOT IN (:...pay_type)", { pay_type: ["Sử dụng cọc"] })
                            .addSelect("SUM(transaction.paid_amount)", "sum_paid_amount")
                            .andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                            .andWhere("order.status = 3")
                            .andWhere('transaction.soft_delete IS NULL')
                            .leftJoinAndSelect("transaction.order", "order")
                            .leftJoinAndSelect("transaction.store", "store")
                            .groupBy("order.store_id")
                            .getRawMany()
                            .then(rs => {
                                cb(null, rs)
                            })
                        },
                        revenueByOwed: (cb) => {
                            let data = this.transactionRepository.createQueryBuilder("transaction")
                            .andWhere("transaction.status = 2")
                            .addSelect("SUM(transaction.paid_amount)", "sum_owe_money")
                            .andWhere('transaction.soft_delete IS NULL')
                            .andWhere('transaction.created_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                            .leftJoinAndSelect("transaction.store", "store")
                            .groupBy("transaction.store_id")
                            .getRawMany()
                            .then(rs => {
                                cb(null, rs)
                            })
                        },
                        countByLocations: (cb) => {
                            this.orderRepository
                                .createQueryBuilder("order")
                                .where('order.soft_delete IS NULL')
                                .select("SUM(order.total_price)", "sum_total_price")
                                .addSelect("SUM(order.deposit_total)", "sum_deposit_total")
                                .addSelect("COUNT(order.id)", "total_orders")
                                .andWhere("order.status = 3")
                                .andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                                .leftJoinAndSelect("order.stores", "store")
                                .groupBy("order.store_id")
                                .getRawMany().then(rs => {
                                    cb(null, rs)
                                })
                        },
                        countUserByLocations: (cb) => {
                            this.userRepository
                                .createQueryBuilder("user")
                                .select("COUNT(user.id)", "total_users")
                                .where("user.status = :status", { status: 1 })
                                .andWhere("store.id IS NOT NULL")
                                .leftJoinAndSelect("user.stores", "store")
                                .groupBy("store.id")
                                .getRawMany().then(rs => cb(null, rs))
                        }
                    }).then(rs => {
                        const { countByLocations, countUserByLocations, revenueByOrder, revenueByOwed } = rs
                        const grouped = _.groupBy([...countByLocations, ...countUserByLocations, ...revenueByOrder, ...revenueByOwed], (x) => x.store_id)
                        const convertData = Object.entries(grouped);
                        Promise.all(convertData.map(x => {
                            const y = { ...x[1][0], ...x[1][1], ...x[1][2], ...x[1][3] }
                            return { id: x[0], ...y }
                        })).then(rs => {
                            cb(null, rs)
                        })
                    })
                },
            }).then(rs => {
                return helper.success(rs)
            })
        } catch (error) {
            return helper.error(error)
        }
    }
    async CountCustomers(query: QueryReport) {
        const { store, startDate, endDate } = query
        try {
            var customerQuery =  this.customerRepository
            .createQueryBuilder("customer")
            .innerJoinAndSelect("customer.order", "order")
            .where('order.soft_delete IS NULL')
            .andWhere('order.status = 3')
            .orderBy('order.order_at', 'DESC')
            if (store != 0) {
                customerQuery
                    .andWhere("order.store_id = :id", { id: store })
                    .leftJoinAndSelect("order.stores", "store_id")
            }
            customerQuery.andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })

            var dataCustomers = await customerQuery.getMany()
            var orderCodes = []
            var customerId = []
            for (let item of dataCustomers) {
                var orderMinOrderAt =  _.minBy(item.order, 'order_at')
                customerId.push(item.id)
                orderCodes.push(orderMinOrderAt.order_code)
            }
            const customerIds = _.uniq(customerId)
            const customerNewOlds = await this.handleCustomerOldNew(customerIds, orderCodes, store)

            return async.parallel({
                receipt: (cb) => {
                    async.parallel({
                        receipt: (cb) => {
                            let query = this.orderRepository
                                .createQueryBuilder("order")
                                .where('order.soft_delete IS NULL')
                                .andWhere('order.status = 3')
                                .select("SUM(order.total_price)", "sum_total_price")
                                .addSelect("SUM(order.deposit_total)", "sum_deposit_total")
                            if (store != 0) {
                                query
                                .andWhere("order.store_id = :id", { id: store })
                                .leftJoinAndSelect("order.stores", "store_id")
                                .groupBy("order.store_id")
                            }
                            query.andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                                .getRawMany().then(rs => {
                                    cb(null, rs)
                                })
                        },
                        revenue: (cb) => {
                            let query = this.transactionRepository
                                .createQueryBuilder("transaction")
                                .where('transaction.soft_delete IS NULL')
                                .select("SUM(transaction.paid_amount)", "sum_paid_amount")
                            if (store != 0) {
                                query.andWhere("transaction.store_id = :id", { id: store })
                                .leftJoinAndSelect("transaction.store", "store")
                                .groupBy("store_id")
                            }
                            query.andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                            .andWhere('order.status = 3')
                            .leftJoinAndSelect("transaction.order", "order")    
                            .getRawMany().then(rs => {
                                cb(null, rs)
                            })
                        },
                        receiptOwed: (cb) => {
                            let query = this.transactionRepository
                                .createQueryBuilder("transaction")
                                .where('transaction.soft_delete IS NULL')
                                .andWhere("transaction.status = :status", { status: 2 })
                            if (store == 0) {
                                query.select("SUM(transaction.paid_amount)", "sum_paid_amount")
                            } else {
                                query.select("SUM(transaction.paid_amount)", "sum_paid_amount")
                                    .andWhere("transaction.store_id = :id", { id: store })
                                    .groupBy("store_id")
                            }
                            query.andWhere('transaction.created_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                                .getRawMany().then(rs => {
                                    cb(null, rs)
                                })
                        }
                    }).then(rs => cb(null, rs))
                },
                newCustomers: (cb) => {
                    async.parallel({
                        count: (cb) => {
                            cb(null, customerNewOlds.length)
                        },
                        receipt: (cb) => {
                            let query = this.customerRepository
                                .createQueryBuilder("customer")
                                .where('customer.soft_delete IS NULL')
                                .innerJoinAndSelect("customer.order", "order")
                                .andWhere('order.soft_delete IS NULL')
                                .andWhere('order.status = 3')
                            if (customerNewOlds.length == 0) {
                                query.andWhere("customer.id IN ('NULL')")
                            } else {
                                query.andWhere("customer.id IN (:...ids)", { ids: customerNewOlds })
                            }
                            if (store != 0) {
                                query.andWhere("order.store_id = :id", { id: store })
                                .leftJoinAndSelect("order.stores", "store_id")
                            }
                            query.andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                            .getRawMany().then(rs => {

                                const result = _.sumBy(rs, function (o) { return o.order_total_price });
                                const totalDeposit = _.sumBy(rs, function (o) { return o.order_deposit_total });
                                cb(null, (result - totalDeposit))
                            })
                        }
                    }).then(rs => cb(null, rs))
                },
                comback: (cb) => {
                    async.parallel({
                        count: (cb) => {
                            cb(null, customerIds.length - customerNewOlds.length)
                        },
                        receipt: (cb) => {
                            let query = this.orderRepository
                                .createQueryBuilder("order")
                                .where('order.soft_delete IS NULL')
                                .andWhere("order.status = 3")
                                .leftJoinAndSelect("order.customers", "customer")

                            if (customerNewOlds.length > 0) {
                                query.andWhere("customer.id NOT IN (:...ids)", { ids: customerNewOlds })
                            }
                            if (store != 0) {
                                query
                                    .andWhere("order.store_id = :id", { id: store })
                                    .leftJoinAndSelect("order.stores", "store_id")
                            }
                            query.andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                            .getRawMany().then(rs => {
                                const result = _.sumBy(rs, function (o) { return o.order_total_price });
                                const totalDeposit = _.sumBy(rs, function (o) { return o.order_deposit_total });
                                cb(null, (result - totalDeposit))
                            })
                        }
                    }).then(rs => cb(null, rs))
                },
                dataChart: (cb) => {
                    let query = this.transactionRepository
                        .createQueryBuilder("transaction")
                        .where('transaction.soft_delete IS NULL')
                        .andWhere("order.status = 3")
                        .leftJoinAndSelect("transaction.order", "order")
                        .leftJoinAndSelect("order.customers", "customer")
                    if (store != 0) {
                        query.andWhere("order.store_id = :id", { id: store })
                    }
                    query.andWhere('transaction.created_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                        .getRawMany().then(rs => {
                            const grouped = _.groupBy(rs, (x) => x.customer_id)
                            const convertData = Object.entries(grouped)
                            Promise.all(convertData.map(x => {
                                const result = _.sumBy(x[1], function (o) { return o.transaction_paid_amount });
                                return {
                                    name: x[1][0].customer_full_name, value: result
                                }
                            })).then(d => {
                                let sort = _.orderBy(d, ['value'], ['desc']).slice(0, 10);
                                cb(null, sort)
                            })
                        })
                },
                dataTable: (cb) => {
                    async.parallel({
                        combackCustomer: (cb) => {
                            let query = this.customerRepository
                                .createQueryBuilder("customer")
                                .innerJoinAndSelect("customer.order", "order")
                                .where('order.soft_delete IS NULL')
                                .andWhere('order.status = 3')
                                .orderBy('order.order_at', 'DESC')
                            if (store != 0) {
                                query
                                    .andWhere("order.store_id = :id", { id: store })
                                    .leftJoinAndSelect("order.stores", "store_id")
                            }
                            query.andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                                .getMany().then(rs => {
                                    cb(null, rs)
                                })
                        }
                    }).then(async rs => {
                        var comebackCustomers = rs['combackCustomer']


                        Promise.all(comebackCustomers.map(x => {
                            const result = _.sumBy(x.order, function (o) { return o.total_price });
                            const owed = _.sumBy(x.order, function (o) { return o.money_owed });
                            const deposit = _.sumBy(x.order, function (o) { return o.deposit_total ?? 0 });

                            var type = "Khách quay lại"
                            if (customerNewOlds.includes(x.id)) {
                                type = "Khách mới"
                            }
                            return {
                                cus: { name: x.full_name, phone: x.mobile, id: x.id }, value: result - deposit,
                                type: type, orders: _.size(x.order), owed, receipt: result - owed - deposit, deposit: deposit ?? 0
                            }
                        })).then(d => {
                            cb(null, d)
                        })
                    })
                }
            }).then(rs => {
                return helper.success(rs)
            })
        } catch (error) {
            return helper.error(error)
        }
    }
    async getOrdersByCustomer(id, query) {
        const customer = await this.customerRepository.findOne({
            where: {
                id: id
            }
        })
        if (!customer) return helper.notFound("Không thấy khách hàng đó")
        const { page, limit } = query
        const options = {
            limit: parseInt(limit),
            page: parseInt(page)
        }
        try {
            const query = {
                where: {
                    customers: {
                        id: id
                    },
                    status: 3,
                }, relations: { orderItem: true, customers: true }
            }

            const res = await paginate(this.orderRepository, options, query);
            return helper.success(res)
        } catch (error) {
            return helper.error(error)
        }
    }
    async getUsersByStore(id) {
        try {
            let query = {}
            if (id != 0) {
                query = {

                    id: id
                }
            }
            const users = await this.storeRepository.find({
                where: {
                    ...query,
                    users: {
                        status: 1
                    }
                },
                relations: { users: true },
            })
            return helper.success(users[0].users.length)
        } catch (error) {
            return helper.error(error)
        }
    }
    async countUser(query: QueryReport) {
        try {
            const { store, startDate, endDate } = query

            let queryBuild = this.orderRepository
                .createQueryBuilder("order")
                .where('order.soft_delete IS NULL')
                .andWhere('order.status = 3')
                .leftJoinAndSelect("order.orderItem", "orderItem")
            if (store != 0) {
                queryBuild
                    .andWhere("order.store_id = :id", { id: store })
            }
            return queryBuild
                .andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                .getRawMany().then(async rs => {
                    return async.parallel({
                        dataTable: (cb) => {
                            async.parallel({
                                employee1: (cb) => {
                                    async.parallel({
                                        service: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_service_name1 != null && x.orderItem_employee_service_name1 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_service_name1
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    valueServe: sum,
                                                    countServe: _.filter(x[1], (x) => x).length
                                                }
                                            })
                                            cb(null, newData)
                                        },
                                        consult: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_consultant_name1 != null && x.orderItem_employee_consultant_name1 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_consultant_name1
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    valueConsult: sum,
                                                    countColsult: _.filter(x[1], (x) => x).length
                                                }
                                            })
                                            cb(null, newData)
                                        }
                                    }).then(rs => {
                                        const { service, consult } = rs
                                        const grouped = _.groupBy([...service, ...consult], (x) => x.name)
                                        const newData = Object.entries(grouped).map(x => {
                                            if (x[1][0].valueServe) {
                                                return {
                                                    name: x[0],
                                                    valueServe: x[1][0].valueServe,
                                                    countServe: x[1][0].countServe,
                                                    valueConsult: x[1][1]?.valueConsult || 0,
                                                    countColsult: x[1][1]?.countColsult || 0,
                                                }

                                            } else {
                                                return {
                                                    name: x[0],
                                                    valueServe: 0,
                                                    countServe: 0,
                                                    valueConsult: x[1][0].valueConsult || 0,
                                                    countColsult: x[1][0].countColsult || 0,
                                                }
                                            }

                                        })
                                        cb(null, newData)
                                    })
                                },
                                employee2: (cb) => {
                                    async.parallel({
                                        service: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_service_name2 != null && x.orderItem_employee_service_name2 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_service_name2
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    valueServe: sum,
                                                    countServe: _.filter(x[1], (x) => x).length
                                                }
                                            })
                                            cb(null, newData)
                                        },
                                        consult: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_consultant_name2 != null && x.orderItem_employee_consultant_name2 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_consultant_name2
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    valueConsult: sum,
                                                    countColsult: _.filter(x[1], (x) => x).length
                                                }
                                            })
                                            cb(null, newData)
                                        }
                                    }).then(rs => {
                                        const { service, consult } = rs
                                        const grouped = _.groupBy([...service, ...consult], (x) => x.name)
                                        const newData = Object.entries(grouped).map(x => {
                                            if (x[1][0].valueServe) {
                                                return {
                                                    name: x[0],
                                                    valueServe: x[1][0].valueServe,
                                                    countServe: x[1][0].countServe,
                                                    valueConsult: x[1][1]?.valueConsult || 0,
                                                    countColsult: x[1][1]?.countColsult || 0,
                                                }

                                            } else {
                                                return {
                                                    name: x[0],
                                                    valueServe: 0,
                                                    countServe: 0,
                                                    valueConsult: x[1][0].valueConsult || 0,
                                                    countColsult: x[1][0].countColsult || 0,
                                                }
                                            }

                                        })
                                        cb(null, newData)
                                    })
                                },
                                employee3: (cb) => {
                                    async.parallel({
                                        service: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_service_name3 != null && x.orderItem_employee_service_name3 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_service_name3
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    valueServe: sum,
                                                    countServe: _.filter(x[1], (x) => x).length
                                                }
                                            })
                                            cb(null, newData)
                                        },
                                        consult: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_consultant_name3 != null && x.orderItem_employee_consultant_name3 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_consultant_name3
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    valueConsult: sum,
                                                    countColsult: _.filter(x[1], (x) => x).length
                                                }
                                            })
                                            cb(null, newData)
                                        }
                                    }).then(rs => {
                                        const { service, consult } = rs
                                        const grouped = _.groupBy([...service, ...consult], (x) => x.name)
                                        const newData = Object.entries(grouped).map(x => {
                                            if (x[1][0].valueServe) {
                                                return {
                                                    name: x[0],
                                                    valueServe: x[1][0].valueServe,
                                                    countServe: x[1][0].countServe,
                                                    valueConsult: x[1][1]?.valueConsult || 0,
                                                    countColsult: x[1][1]?.countColsult || 0,
                                                }

                                            } else {
                                                return {
                                                    name: x[0],
                                                    valueServe: 0,
                                                    countServe: 0,
                                                    valueConsult: x[1][0].valueConsult || 0,
                                                    countColsult: x[1][0].countColsult || 0,
                                                }
                                            }

                                        })
                                        cb(null, newData)
                                    })
                                },
                                employee4: (cb) => {
                                    async.parallel({
                                        service: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_service_name4 != null && x.orderItem_employee_service_name4 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_service_name4
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    valueServe: sum,
                                                    countServe: _.filter(x[1], (x) => x).length
                                                }
                                            })
                                            cb(null, newData)
                                        },
                                        consult: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_consultant_name4 != null && x.orderItem_employee_consultant_name4 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_consultant_name4
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    valueConsult: sum,
                                                    countColsult: _.filter(x[1], (x) => x).length
                                                }
                                            })
                                            cb(null, newData)
                                        }
                                    }).then(rs => {
                                        const { service, consult } = rs
                                        const grouped = _.groupBy([...service, ...consult], (x) => x.name)
                                        const newData = Object.entries(grouped).map(x => {
                                            if (x[1][0].valueServe) {
                                                return {
                                                    name: x[0],
                                                    valueServe: x[1][0].valueServe,
                                                    countServe: x[1][0].countServe,
                                                    valueConsult: x[1][1]?.valueConsult || 0,
                                                    countColsult: x[1][1]?.countColsult || 0,
                                                }

                                            } else {
                                                return {
                                                    name: x[0],
                                                    valueServe: 0,
                                                    countServe: 0,
                                                    valueConsult: x[1][0].valueConsult || 0,
                                                    countColsult: x[1][0].countColsult || 0,
                                                }
                                            }

                                        })
                                        cb(null, newData)
                                    })
                                },
                                employee5: (cb) => {
                                    async.parallel({
                                        service: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_service_name5 != null && x.orderItem_employee_service_name5 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_service_name5
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    valueServe: sum,
                                                    countServe: _.filter(x[1], (x) => x).length
                                                }
                                            })
                                            cb(null, newData)
                                        },
                                        consult: (cb) => {
                                            const filterArray = _.filter(rs, (x) => x.orderItem_employee_consultant_name5 != null)
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_consultant_name5
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    valueConsult: sum,
                                                    countColsult: _.filter(x[1], (x) => x).length
                                                }
                                            })
                                            cb(null, newData)
                                        }
                                    }).then(rs => {
                                        const { service, consult } = rs
                                        const grouped = _.groupBy([...service, ...consult], (x) => x.name)
                                        const newData = Object.entries(grouped).map(x => {
                                            if (x[1][0].valueServe) {
                                                return {
                                                    name: x[0],
                                                    valueServe: x[1][0].valueServe,
                                                    countServe: x[1][0].countServe,
                                                    valueConsult: x[1][1]?.valueConsult || 0,
                                                    countColsult: x[1][1]?.countColsult || 0,
                                                }

                                            } else {
                                                return {
                                                    name: x[0],
                                                    valueServe: 0,
                                                    countServe: 0,
                                                    valueConsult: x[1][0].valueConsult || 0,
                                                    countColsult: x[1][0].countColsult || 0,
                                                }
                                            }

                                        })
                                        cb(null, newData)
                                    })
                                }
                            }).then(rs1 => {
                                const { employee1, employee2, employee3, employee4, employee5 } = rs1
                                const grouped = _.groupBy([...employee1, ...employee2, ...employee3, ...employee4, ...employee5], (x) => x.name)
                                return Promise.all(Object.entries(grouped).map(x => {
                                    return async.parallel({
                                        sumvalueServe: (cb) => {
                                            const sum = _.sumBy(x[1], function (o) { return o.valueServe })
                                            cb(null, sum)
                                        },
                                        sumcountServe: (cb) => {
                                            const sum = _.sumBy(x[1], function (o) { return o.countServe })
                                            cb(null, sum)
                                        },
                                        sumvalueConsult: (cb) => {
                                            const sum = _.sumBy(x[1], function (o) { return o.valueConsult })
                                            cb(null, sum)
                                        },
                                        sumcountColsult: (cb) => {
                                            const sum = _.sumBy(x[1], function (o) { return o.countColsult })
                                            cb(null, sum)
                                        }
                                    }).then(rs3 => {
                                        const { sumvalueServe, sumcountServe, sumvalueConsult, sumcountColsult } = rs3
                                        return {
                                            name: x[0],
                                            valueServe: sumvalueServe,
                                            countServe: sumcountServe,
                                            valueConsult: sumvalueConsult,
                                            countColsult: sumcountColsult,
                                            total: sumvalueServe + sumvalueConsult
                                        }
                                    })
                                })).then(rs => {
                                    cb(null, rs)
                                })
                            })
                        },
                        dataChart: (cb) => {
                            async.parallel({
                                employee1: (cb) => {
                                    async.parallel({
                                        service: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_service_name1 != null && x.orderItem_employee_service_name1 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_service_name1
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    value: sum,
                                                    type: "Doanh số dịch vụ"
                                                }
                                            })

                                            cb(null, newData)
                                        },
                                        consult: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_consultant_name1 != null && x.orderItem_employee_consultant_name1 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_consultant_name1
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    value: sum,
                                                    type: "Doanh số tư vấn"
                                                }
                                            })
                                            cb(null, newData)
                                        }
                                    }).then(rs => {
                                        const { service, consult } = rs
                                        cb(null, [...service, ...consult])
                                    })
                                },
                                employee2: (cb) => {
                                    async.parallel({
                                        service: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_service_name2 != null && x.orderItem_employee_service_name2 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_service_name2
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    value: sum,
                                                    type: "Doanh số dịch vụ"
                                                }
                                            })
                                            cb(null, newData)
                                        },
                                        consult: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_consultant_name2 != null && x.orderItem_employee_consultant_name2 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_consultant_name2
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    value: sum,
                                                    type: "Doanh số tư vấn"
                                                }
                                            })
                                            cb(null, newData)
                                        }
                                    }).then(rs => {
                                        const { service, consult } = rs
                                        cb(null, [...service, ...consult])
                                    })
                                },
                                employee3: (cb) => {
                                    async.parallel({
                                        service: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_service_name3 != null && x.orderItem_employee_service_name3 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_service_name3
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    value: sum,
                                                    type: "Doanh số dịch vụ"
                                                }
                                            })
                                            cb(null, newData)
                                        },
                                        consult: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_consultant_name3 != null && x.orderItem_employee_consultant_name3 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_consultant_name3
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    value: sum,
                                                    type: "Doanh số tư vấn"
                                                }
                                            })
                                            cb(null, newData)
                                        }
                                    }).then(rs => {
                                        const { service, consult } = rs
                                        cb(null, [...service, ...consult])
                                    })
                                },
                                employee4: (cb) => {
                                    async.parallel({
                                        service: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_service_name4 != null && x.orderItem_employee_service_name4 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_service_name4
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    value: sum,
                                                    type: "Doanh số dịch vụ"
                                                }
                                            })
                                            cb(null, newData)
                                        },
                                        consult: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_consultant_name4 != null && x.orderItem_employee_consultant_name4 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_consultant_name4
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    value: sum,
                                                    type: "Doanh số tư vấn"
                                                }
                                            })
                                            cb(null, newData)
                                        }
                                    }).then(rs => {
                                        const { service, consult } = rs
                                        cb(null, [...service, ...consult])
                                    })
                                },
                                employee5: (cb) => {
                                    async.parallel({
                                        service: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_service_name5 != null && x.orderItem_employee_service_name5 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_service_name5
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    value: sum,
                                                    type: "Doanh số dịch vụ"
                                                }
                                            })
                                            cb(null, newData)
                                        },
                                        consult: (cb) => {
                                            const filterArray = _.filter(rs, (x) => {
                                                return (x.orderItem_employee_consultant_name5 != null && x.orderItem_employee_consultant_name5 != "")
                                            })
                                            const mapArray = filterArray.map(x => {
                                                return {
                                                    value: x.order_total_price,
                                                    name: x.orderItem_employee_consultant_name5
                                                }
                                            })
                                            const grouped = _.groupBy(mapArray, (x) => {
                                                return x.name
                                            })
                                            const newData = Object.entries(grouped).map(x => {
                                                const sum = _.sumBy(x[1], function (o) { return o.value });
                                                return {
                                                    name: x[0],
                                                    value: sum,
                                                    type: "Doanh số tư vấn"
                                                }
                                            })
                                            cb(null, newData)
                                        }
                                    }).then(rs => {
                                        const { service, consult } = rs
                                        cb(null, [...service, ...consult])
                                    })
                                }
                            }).then(rs1 => {
                                const { employee1, employee2, employee3, employee4, employee5 } = rs1
                                cb(null, [...employee1, ...employee2, ...employee3, ...employee4, ...employee5])
                            })
                        }
                    }).then(rs => {
                        return helper.success(rs)
                    })

                })
        } catch (error) {
            return helper.error(error)
        }
    }
    async countReceipt(query: QueryReport) {
        try {
            const { store, startDate, endDate } = query
            return await async.parallel({
                dataChart: (cb) => {
                    let queryBuild = this.transactionRepository.createQueryBuilder("transaction")
                        .where('transaction.soft_delete IS NULL')
                        .andWhere('order.status = 3')
                    if (store != 0) {
                        queryBuild
                            .andWhere("order.store_id = :id", { id: store })
                    }
                    queryBuild.andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                        .andWhere('transaction.created_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                        .leftJoinAndSelect("transaction.store", "store")
                        .leftJoinAndSelect("transaction.order", "order")
                        .getRawMany().then(result => {
                            if (result.length > 0) {
                                const grouped = _.groupBy(result, (x) => x.store_name_store)
                                const convertData = Object.entries(grouped)
                                return Promise.all(convertData.map(x => {
                                    const sum = _.sumBy(x[1], function (o) { return o.transaction_paid_amount })
                                    return {
                                        name: x[0], value: sum
                                    }
                                })).then(rs => {
                                    cb(null, rs)
                                })
                            } else {
                                if (store == 0) {
                                    this.storeRepository.find().then(rs => {
                                        Promise.all(rs.map(x => {
                                            return [{ name: x.name_store, value: 0 }]
                                        }))
                                    })
                                } else {
                                    this.storeRepository.findOne({
                                        where: {
                                            id: store
                                        }
                                    }).then(rs => {
                                        cb(null, [{ name: rs.name_store, value: 0 }])
                                    })
                                }
                            }
                        })
                },
                dataTable: (cb) => {
                    let queryBuild = this.orderRepository.createQueryBuilder("order")
                        .where('order.soft_delete IS NULL')
                        .andWhere('order.status = 3')
                    if (store != 0) {
                        queryBuild
                            .andWhere("order.store_id = :id", { id: store })
                    }
                    queryBuild
                        .andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                        .leftJoinAndSelect("order.stores", "store")
                        .getRawMany().then(rs => {
                            if (rs.length === 0) {
                                if (store == 0) {
                                    this.storeRepository.find().then(rs => {
                                        Promise.all(rs.map(x => {
                                            return { name: x.name_store, orders: 0, id: x.id }
                                        }))
                                    }).then(rs => cb(null, rs))
                                } else {
                                    this.storeRepository.findOne({
                                        where: {
                                            id: store
                                        }
                                    }).then(rs => {
                                        cb(null, { name: rs.name_store, orders: 0, id: rs.id })
                                    })
                                }
                            } else {
                                const grouped = _.groupBy(rs, (x) => x.store_name_store)
                                const convertData = Object.entries(grouped)
                                Promise.all(convertData.map(x => {
                                    return {
                                        name: x[0], orders: _.filter(x[1], function (o) { return o }).length, id: x[1][0].store_id
                                    }
                                })).then(rs => {
                                    cb(null, rs)
                                })
                            }
                        })
                }
            }).then(async (rs) => {
                let { dataChart, dataTable } = rs
                if (store == 0) {
                    return await Promise.all(dataTable.map((x, i) => {
                        const index = dataChart.findIndex(y => y.name == x.name)
                        return {
                            name: x.name,
                            orders: x.orders,
                            value: dataChart[index].value,
                            id: x.id
                        }
                    })).then(rs => {
                        return helper.success({
                            dataChart,
                            newDataTable: rs
                        })
                    })
                } else {
                    return helper.success({
                        dataChart,
                        newDataTable: [{
                            ...dataChart[0],
                            ...dataTable[0]
                        }]
                    })
                }
            })
        } catch (error) {
            return helper.error(error, 'report.cashiers')
        }
    }
    async countProduct(query: QueryReport) {
        try {
            const { store, startDate, endDate } = query
            return async.parallel({
                packetReceipt: (cb) => {
                    let query = this.orderRepository
                        .createQueryBuilder("order")
                        .where('order.soft_delete IS NULL')
                    if (store != 0) {
                        query
                            .andWhere("order.store_id = :id", { id: store })
                            .leftJoinAndSelect("order.stores", "store_id")
                    }
                    query.andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                        .leftJoinAndSelect('order.orderItem', "orderItem")
                        .leftJoinAndSelect("orderItem.product", "product")
                        .andWhere("product.type=:productType", { productType: 2 })
                        .getRawMany().then(rs => {
                            if (rs.length > 0) {
                                const sum = _.sumBy(rs, (x) => x.orderItem_price)
                                cb(null, sum)
                            } else {
                                cb(null, 0)
                            }
                        })
                },
                receipt: (cb) => {
                    let query = this.orderRepository
                        .createQueryBuilder("order")
                        .where('order.soft_delete IS NULL')
                    if (store == 0) {
                        query
                            .select("SUM(order.total_price)", "sum_total_price")
                            .addSelect("SUM(order.money_owed)", "sum_money_owed")
                            .addSelect("SUM(order.deposit_total)", "sum_deposit_total")
                    } else {
                        query
                            .select("SUM(order.total_price)", "sum_total_price")
                            .addSelect("SUM(order.money_owed)", "sum_money_owed")
                            .addSelect("SUM(order.deposit_total)", "sum_deposit_total")
                            .andWhere("order.store_id = :id", { id: store })
                            .leftJoinAndSelect("order.stores", "store_id")
                            .groupBy("order.store_id")
                    }
                    query.andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                        .getRawMany().then(rs => {
                            if (rs.length > 0) {
                                cb(null, {
                                    receipt: parseInt(rs[0].sum_total_price) || 0,
                                    revenue: (parseInt(rs[0].sum_total_price) - parseInt(rs[0].sum_money_owed) - parseInt(rs[0].sum_deposit_total)) || 0,
                                    deposit: (parseInt(rs[0].sum_deposit_total)) || 0
                                })
                            } else {
                                cb(null, {
                                    receipt: 0,
                                    revenue: 0,
                                    deposit: 0
                                })
                            }
                        })
                },
                service: (cb) => {
                    let query = this.orderRepository
                        .createQueryBuilder("order")
                        .where('order.soft_delete IS NULL')
                    if (store != 0) {
                        query
                            .andWhere("order.store_id = :id", { id: store })
                            .leftJoinAndSelect("order.stores", "store_id")
                    }
                    query.andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                        .leftJoinAndSelect('order.orderItem', "orderItem")
                        .leftJoinAndSelect("orderItem.product", "product")
                        .andWhere("product.type=:productType", { productType: 1 })
                        .getRawMany().then(rs => {
                            if (rs.length > 0) {
                                const sum = _.sumBy(rs, (x) => x.orderItem_price)
                                cb(null, sum)
                            } else {
                                cb(null, 0)
                            }
                        })
                },
                product: (cb) => {
                    let query = this.orderRepository
                        .createQueryBuilder("order")
                        .where('order.soft_delete IS NULL')
                    if (store != 0) {
                        query
                            .andWhere("order.store_id = :id", { id: store })
                            .leftJoinAndSelect("order.stores", "store_id")
                    }
                    query.andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                        .leftJoinAndSelect('order.orderItem', "orderItem")
                        .leftJoinAndSelect("orderItem.product", "product")
                        .andWhere("product.type=:productType", { productType: 3 })
                        .getRawMany().then(rs => {
                            if (rs.length > 0) {
                                const sum = _.sumBy(rs, (x) => x.orderItem_price)
                                cb(null, sum)
                            } else {
                                cb(null, 0)
                            }
                        })
                },
                dataChart: (cb) => {
                    let queryBuild = this.orderRepository
                        .createQueryBuilder("order")
                        .where('order.soft_delete IS NULL')
                    if (store != 0) {
                        queryBuild
                            .andWhere("order.store_id = :id", { id: store })
                            .leftJoinAndSelect("order.stores", "store_id")
                    }
                    return queryBuild.andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                        .leftJoinAndSelect('order.orderItem', "orderItem")
                        .leftJoinAndSelect("orderItem.product", "product")
                        .getRawMany().then(rs => {
                            if (rs.length > 0) {
                                const grouped = _.groupBy(rs, (x) => x.orderItem_product_name)
                                return Promise.all(Object.entries(grouped).map(x => {
                                    const sum = _.sumBy(x[1], (x) => x.orderItem_price)
                                    return {
                                        name: x[0],
                                        sum
                                    }

                                })).then(rs1 => {
                                    const orderChart = _.orderBy(rs1, ['sum'], ['desc']).slice(0, 10);
                                    cb(null, orderChart)
                                })
                            } else {
                                cb(null, rs)
                            }
                        })
                }
            }).then(rs => {
                return helper.success(rs)
            })

        } catch (error) {
            return helper.error(error)
        }
    }
    async tableProduct(query: QueryReport) {
        try {
            const { store, startDate, endDate, typeProduct } = query
            let queryBuild = this.orderRepository
                .createQueryBuilder("order")
                .where('order.soft_delete IS NULL')
            if (store != 0) {
                queryBuild
                    .andWhere("order.store_id = :id", { id: store })
                    .leftJoinAndSelect("order.stores", "store_id")
            }
            if (typeProduct != 0) {
                queryBuild.andWhere("product.type=:productType", { productType: typeProduct })
            }
            return queryBuild.andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(new Date(startDate)), end_at: endOfDay(new Date(endDate)) })
                .leftJoinAndSelect('order.orderItem', "orderItem")
                .leftJoinAndSelect("orderItem.product", "product")
                .getRawMany().then(rs => {
                    if (rs.length > 0) {
                        const grouped = _.groupBy(rs, (x) => x.orderItem_product_name)
                        return Promise.all(Object.entries(grouped).map(x => {
                            const sum = _.sumBy(x[1], (x) => x.orderItem_price)
                            return {
                                object: {
                                    code: x[1][0].orderItem_product_code,
                                    name: x[0],

                                },
                                count: _.filter(x[1], (x) => x).length,
                                sum
                            }
                        })).then(rs1 => helper.success(rs1))
                    } else {
                        return helper.success(rs)
                    }
                })


        } catch (error) {
            return helper.error(error)
        }
    }

    async handleCustomerOldNew(customerIds, orderCodes, store) {
        var customerNews = []
        if (customerIds.length == 0) {
            return customerNews
        }

        var query = this.customerRepository.createQueryBuilder('customer')
            .where("customer.soft_delete IS NULL")
            .andWhere("customer.id IN (:...ids)", { ids: customerIds })
            .andWhere("order.soft_delete IS NULL")
            .andWhere('order.status = 3')
            .innerJoinAndSelect("customer.order", "order")

        var customers =  await query.getMany()

        
        for(let item of customers) {
            var statusNew = false
            if (item.order) {
                var orderMinOrderAt =  _.minBy(item.order, 'order_at')
                if (orderMinOrderAt && orderCodes.includes(orderMinOrderAt.order_code)) {
                    statusNew = true
                }
            }

            if (statusNew) {
                customerNews.push(item.id)
            }
        }


        return customerNews
    }

}
