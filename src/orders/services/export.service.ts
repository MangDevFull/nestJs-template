import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, Brackets } from 'typeorm';
import { format, startOfDay, endOfDay } from 'date-fns'
import { Order } from '../entities/orders.entity'
import * as helper from '../../helpers/response';
import * as constant from '../constant/constant';
import { User } from '../../users/users.entity'
import { Store } from '../../stores/stores.entity'
import { Customer } from '../../customers/entities/customers.entity';
import { OrderListParam } from 'src/orders/interface/order.interfaces';
import { OrderItem } from '../entities/order-item.entity'
import { Package } from '../../package/package.entity'
import { Workbook } from 'exceljs'
import * as tmp from 'tmp'
import * as AWS from "aws-sdk";
import * as dotenv from 'dotenv';
dotenv.config();

// import * as AWS from "aws-sdk";


let _ = require('lodash');

@Injectable()
export class ExportService {
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
    ) { }

    dataFile
    async exportOrderList(
        param: OrderListParam,
        id_store: number) {
        try {
            var statusFilter = true;
            let newDate = new Date
            var start = new Date(newDate.setHours(0, 0, 0, 0))
            var end = new Date(newDate.setHours(0, 0, 0, 0))
            end.setDate(end.getDate() + 1);
            let query = this.orderRepo.createQueryBuilder('order')
                .where("order.soft_delete IS NULL")
                .innerJoinAndSelect("order.stores", "stores")
                .innerJoinAndSelect("order.customers", "customers")
                // .leftJoinAndSelect("order.transaction", "transaction")
                .leftJoinAndSelect("order.User", "User")
                .leftJoinAndSelect("order.updatedBy", "updatedBy")

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

            if (statusFilter) {
                query = query.andWhere(
                    'order.order_at BETWEEN :start_at AND :end_at',
                    { start_at: startOfDay(start), end_at: endOfDay(end) })
            }
            var urlS3
            if (param.type_export ==  1) {
                urlS3 = await this.exportDataOrder(query, start, end)
            } else {
                urlS3 = await this.exportDataOrderDetail(query, start, end)

            }
            return helper.success({
                url: urlS3,
                // dataExportDetails: dataExportDetails
            })
        } catch (error) {
            return helper.error(error, "exprot.service")
        }
    }

    async exportDataOrder(query: any, start, end) {
        

        try{
            query =  query.leftJoinAndSelect("order.transaction", "transaction")
            var data = constant.defaultExprotOrder
            var row = await this.getRowDefault(start, end)
            row.push(Object.values(data))
            const orders = await query.orderBy('order.order_at', 'DESC')
            .orderBy('stores.id', 'DESC').getMany()
    
            var totalPriceBefore = 0, discountByTotalBills = 0,
                pricePoints = 0, discountByRules = 0, totalPrices = 0,
                moneyOweds = 0, payMoneys = 0, payBankings = 0, payCards = 0, payElectronics = 0, cods = 0, depositTotal = 0 , totalSalesAll = 0;
            orders.forEach(doc => {
                var payMoney = 0, payBanking = 0, payCard = 0, cod = 0, paySlectronic = 0;
                if (doc.transaction && doc.transaction.length > 0) {
                    doc.transaction.map((val, key) => {
                        if (val.pay_type == "Tiền mặt") {
                            payMoney += val.paid_amount
                        } else if (val.pay_type == "Chuyển khoản") {
                            payBanking += val.paid_amount
                        } else if (val.pay_type == "Quẹt thẻ") {
                            payCard += val.paid_amount
                        } else if (val.pay_type == "Ship COD" || val.pay_type == "COD") {
                            cod += val.paid_amount
                        } else if (val.pay_type == "Sử dụng cọc") {
                            depositTotal += val.paid_amount
                        } else {
                            paySlectronic += val.paid_amount
                        }
                    })
    
                }


                let createName = doc.order_staff_booking
                let totalSales =  doc.total_price
                if (doc.deposit_total) {
                    totalSales =  doc.total_price - doc.deposit_total
                }

                let order = {
                    order_code: doc.order_code.replace("HD", ""),
                    order_at: doc.order_at,
                    customer_name: doc.customers ? doc.customers.full_name : "",
                    customer_mobile: doc.customers ? doc.customers.mobile : "",
                    customer_code: doc.customers ? doc.customers.code : "",
                    customer_new_old: "",
                    group_cutomer: "",
                    source_from: doc.source_from,
                    status: constant.orderStatusOject[doc.status],
                    total_price_before: doc.total_price,
                    discount_by_total_bill: 0,
                    price_point: 0,
                    discount_by_rule: 0,
                    total_price: doc.total_price,
                    total_sales: totalSales,
                    money_owed: doc.money_owed,
                    pay_money: payMoney,
                    pay_banking: payBanking,
                    pay_card: payCard,
                    pay_electronic: paySlectronic,
                    cod: cod,
                    deposit_total: depositTotal,
                    update_name: doc.updatedBy ? doc.updatedBy.name : doc.created_name,
                    create_name: createName,
                    // count_customer: "Số khách hàng đi nhóm",
                    voucher_code: "",
                    points: doc.total_price > 0 ? doc.total_price % 100000 : 0,
                    note: doc.description
                }
                totalPriceBefore += order.total_price_before; discountByTotalBills += order.discount_by_total_bill;
                pricePoints += order.price_point; discountByRules += order.discount_by_rule; totalPrices += order.total_price
                moneyOweds += order.money_owed; payMoneys += order.pay_money; payBankings += order.pay_banking;
                payCards = order.pay_card; payElectronics += order.pay_electronic; cods = order.cod;
                totalSalesAll += order.total_sales
                row.push(Object.values(order))
            })
            var dataEnd = {
                order_code: "Tổng", order_at: "", customer_name: "", customer_mobile: "", customer_code: "",
                customer_new_old: "", group_cutomer: "", source_from: "", status: "", total_price_before: totalPriceBefore,
                discount_by_total_bill: discountByTotalBills, price_point: pricePoints, discount_by_rule: discountByRules,
                total_price: totalPrices, total_sales: totalSalesAll, money_owed: moneyOweds, pay_money: payMoneys, pay_banking: payBankings,
                pay_card: payCards, pay_electronic: payElectronics, cod: cods
            }
    
            row.push(Object.values(dataEnd))
            var urlS3 = await this.uploadFile(row, "hoa_don")
    
            return urlS3

        } catch(err) {
            console.log(err)
        }

        // return row
    }

    async exportDataOrderDetail(query: any, start, end) {

        var orders = await query
            .leftJoinAndSelect("order.orderItem", "orderItem")
            .leftJoinAndSelect("orderItem.product", "product")
            .orderBy('order.order_at', 'DESC')
            .orderBy('stores.id', 'DESC')
            .getRawMany()
        var row = await this.getRowDefault(start, end)
        var row1 = constant.defaultExprotOrderDetail
        row.push(Object.values(row1))
        var customerIds = []
        for (let item of orders) {
            customerIds.push(item.customers_id)
        }
        customerIds = _.uniq(customerIds)
        var codeOrderCustomerNew = await this.handleCustomerOldNew(customerIds)

        orders.forEach(doc => {
            var customer_new_old = false

            if (codeOrderCustomerNew.includes(doc.order_order_code)) {
                customer_new_old = true
            }


            let createName = doc.order_staff_booking
            let nameP = doc.orderItem_product_name ? doc.orderItem_product_name : doc.product_product_name 
            let productName = ""
            
            if (doc.orderItem_price == 0 && doc.orderItem_discount == 0) {
                productName = "Sử dụng " + nameP
            } else {
                if (doc.product_type == 1) {
                    productName = "Sử dụng " + nameP
                } else {
                    productName = "Mua " + nameP
                }
            }
            
            if (doc.order_isDeposit) {
                productName = "Thẻ cọc"
            }
            let typeProduct = constant.typeProduct[doc.product_type]

            if (!typeProduct && productName == "Thẻ cọc") {
                typeProduct = "Thẻ cọc"
            }
            if (!typeProduct) {
                typeProduct = " "
            }

            let orderAt = new Date(doc.order_order_at)

        
            let order = {
                order_code:  doc.order_order_code.replace("HD", ""),
                order_at: orderAt.getDate() + "/" + (orderAt.getMonth() + 1) + "/" + orderAt.getFullYear(),
                customer_name: doc.customers_full_name ? doc.customers_full_name : " ",
                customer_mobile: doc.customers_mobile ?  doc.customers_mobile : " ",
                // customer_code: doc.customers_code,
                product_name: productName ? productName : " ",
                package_code: doc.product_code ? doc.product_code : " ",
                type_product: typeProduct,
                quantity: doc.orderItem_quantity,
                // total_price_after_discount: doc.orderItem_quantity * doc.orderItem_price,
                // discount_order_item: doc.orderItem_discount,
                // total_price_before: 0,
                // price_point: 0,
                // voucher_discount: 0,
                total_price: doc.orderItem_quantity * doc.orderItem_price - doc.orderItem_discount,
                // amount_deducted_from_membership_card: doc.orderItem_amount_deducted_from_membership_card,
                // discount_card_money: 0,
                pay_type: doc.order_payment_type != "Sử dụng cọc" ? doc.order_payment_type : "Tiền mặt",
                customer_new_old: customer_new_old ? 'Khách mới' : 'Khách quay lại',
                source_from: doc.order_source_from ? doc.order_source_from : " ",
                create_name: createName ? createName : " ",
                status: constant.orderStatusOject[doc.order_status],
                employee_service_name1: doc.orderItem_employee_service_name1 ? doc.orderItem_employee_service_name1 : " ",
                // sommission_service1: doc.orderItem_sommission_service1 ? doc.orderItem_sommission_service1 : 0,
                employee_service_name2: doc.orderItem_employee_service_name2 ? doc.orderItem_employee_service_name2 : " ",
                // sommission_service2: doc.orderItem_sommission_service2 ? doc.orderItem_sommission_service2 : 0,
                // employee_service_name3: doc.orderItem_employee_service_name3,
                // sommission_service3: doc.orderItem_sommission_service3 ? doc.orderItem_sommission_service3 : 0,
                // employee_service_name4: doc.orderItem_employee_service_name4,
                // sommission_service4: doc.orderItem_sommission_service4 ? doc.orderItem_sommission_service4 : 0,
                // employee_service_name5: doc.orderItem_employee_service_name5,
                // sommission_service5: doc.orderItem_sommission_service5 ? doc.orderItem_sommission_service5 : 0,

                employee_sell1: "",
                sommission_sell1: 0,
                employee_sell2: "",
                sommission_sell2: 0,
                
                employee_consultant_name1: doc.orderItem_employee_consultant_name1 ?  doc.orderItem_employee_consultant_name1 : " ",
                sommission_consultant1: doc.orderItem_sommission_consultant1 ? doc.orderItem_sommission_consultant1 : 0,
                employee_consultant_name2: doc.orderItem_employee_consultant_name2 ? doc.orderItem_employee_consultant_name2 : " ",
                sommission_consultant2: doc.orderItem_sommission_consultant2 ? doc.orderItem_sommission_consultant2 : 0,
                // employee_consultant_name3: doc.orderItem_employee_consultant_name3,
                // sommission_consultant3: doc.orderItem_sommission_consultant3 ? doc.orderItem_sommission_consultant3 : 0,
                // employee_consultant_name4: doc.orderItem_employee_consultant_name4,
                // sommission_consultant4: doc.orderItem_sommission_consultant4 ? doc.orderItem_sommission_consultant4 : 0,
                // employee_consultant_name5: doc.orderItem_employee_consultant_name5,
                // sommission_consultant5: doc.orderItem_sommission_consultant5 ? doc.orderItem_sommission_consultant5 : 0,
                // commission_presenter: doc.orderItem_commission_presenter ? doc.orderItem_commission_presenter : 0,
                update_name: doc.User_name ? doc.User_name : doc.order_created_name,
                price_ktv: " ",
                // node: doc.order_description
            }

            if (doc.orderItem_id) {
                row.push(Object.values(order))
            }

        })

        var urlS3 = await this.uploadFile(row, "chi_tiet_hoa_don")
        return urlS3
    }

    async handleCustomerOldNew(customerIds) {
        var customers = await this.customerRepo.createQueryBuilder('customer')
            .where("customer.soft_delete IS NULL")
            .where("customer.id IN (:...ids)", { ids: customerIds })
            .andWhere("order.soft_delete IS NULL")
            .innerJoinAndSelect("customer.order", "order")
            .orderBy('order.order_at', 'DESC').getMany()

        var orderCodeNews = []
        for(let item of customers) {
            if (item.order) {
                var orderMinOrderAt =  _.minBy(item.order, 'order_at')
                var orderDeposit = null
                if (orderMinOrderAt.isDeposit) {
                    orderDeposit = orderMinOrderAt
                    var keyMinOrderAt = _.findIndex(item.order, function(o) { return o.order_code == orderMinOrderAt.order_code; });
                    item.order.splice(keyMinOrderAt, keyMinOrderAt)
                    orderMinOrderAt = _.minBy(item.order, 'order_at')
                    orderCodeNews.push(orderDeposit.order_code)
                }

                if (item.order.length <= 0) {
                    continue
                }
                var orderAt1 = orderMinOrderAt.order_at.getFullYear() + '/' + (orderMinOrderAt.order_at.getMonth() + 1) + '/' + orderMinOrderAt.order_at.getDate()
               
                for (let orderItem of item.order) {
                    var orderAt2 = orderItem.order_at.getFullYear() + '/' + (orderItem.order_at.getMonth() + 1) + '/' + orderItem.order_at.getDate()
                    if (orderAt1 == orderAt2) {
                        orderCodeNews.push(orderItem.order_code)
                    }
                }
            }

        }

        return orderCodeNews
    }

    async getRowDefault(start, end) {
        var row = []
        row.push(Object.values({ title: "BẢNG THỐNG KÊ" }))
        row.push(Object.values({}))
        var date = "Thời gian:" + start.toLocaleString() + " - " + end.toLocaleString()
        row.push(Object.values({ date: date }))
        row.push(Object.values({}))
        return row
    }

    async uploadFile(row, name) {
        var fs = require('fs');
        var dir = './public';
        var date = new Date().getTime()

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        let book = new Workbook();
        var sheet = book.addWorksheet('sheet1')
        sheet.addRows(row)
        var fileName = name + date + ".xlsx"
        var file = dir + "/" + fileName

        await book.xlsx.writeFile(file)
        var urlS3 = await this.uploadFileS3(file, fileName)
        if (urlS3) {
            const fs = require('fs')
            if (fs.existsSync(file)) {
                fs.unlinkSync(file)
            }

        }
        return urlS3
    }

    async uploadFileS3(file, name) {
        try {
            var fs = require('fs');
            var urlS3 = ""
            let s3 = new AWS.S3
                ({
                    accessKeyId: process.env.REACT_APP_CCCESS_KEY_ID,
                    secretAccessKey:  process.env.REACT_APP_SECRET_ACCESS_KEY,
                    region: 'hn',
                    endpoint: process.env.REACT_APP_ENDPOINT,
                });

            
            await fs.readFile(file, (err, data) => {
                if (err) throw err;
                this.dataFile = data
                const params = 
                {
                    Bucket: "cent-beauty",
                    Key: String(name),
                    Body: data,
                    ACL: "public-read" 
                };
                s3.upload(params, function(s3Err, data) {
                    if (s3Err) throw s3Err
                });
             });
             await new Promise(r => setTimeout(r, 1500));
                var urlS3 = process.env.REACT_APP_S3_URL + name
            return urlS3
        } catch (e) {
            console.log(e)
            return false
        }

    }

    async processFile(content) {
        console.log(content);
    }


}
