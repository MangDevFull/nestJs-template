import { Injectable, Query } from '@nestjs/common';
import { Package } from 'src/package/package.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult, DeleteResult, NotBrackets, Brackets, MoreThan, LessThanOrEqual, IsNull } from 'typeorm';
import { format, startOfDay, endOfDay } from 'date-fns'
import { Customer } from 'src/customers/entities/customers.entity';
import { Product } from 'src/products/entities/product.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { Cron } from '@nestjs/schedule';
import { Store } from 'src/stores/stores.entity';
import { Order } from 'src/orders/entities/orders.entity';
import * as constant from "./constant/constant"
import * as dotenv from 'dotenv';
import { query } from 'express';
let _ = require('lodash');

@Injectable()
export class CronCustomerUsingService {
    constructor(
        @InjectRepository(Customer,process.env.DB_REPORT_CONNECT_NAME)
        private readonly customerRepo: Repository<Customer>,


    ) { }


    @Cron('0 */10 * * * *')
    async handleCronCustomer() {
        const doc = await this.connectGoogleSheet(process.env.GOOGLE_SHEET_DOC_CUSTOMER_USING_SERVICE)
        await doc.loadInfo();
        
        var rowsNew = await this.getRowsGoogleSheetOrder()
        // _.orderBy(rowsNew, ['Tên KH'], ['asc']);
        // // // console.log(rowsNew)

        // // //sheet Khách hàng
        const sheets = doc.sheetsByIndex[0];
        await sheets.clearRows();
        var rowCustomers = _.chunk(rowsNew, 20000)
        for(let row of rowCustomers) {
            await sheets.addRows(row);
            await new Promise(r => setTimeout(r, 1000));
            console.log(1)
        }

        console.log(true)
    }

    
    async connectGoogleSheet(docKey: String) {
        const { GoogleSpreadsheet } = require('google-spreadsheet');

        const doc = new GoogleSpreadsheet(docKey);
        await doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_SHEET_IMAIL,
            client_id: process.env.GOOGLE_SHEET_ID,
            private_key: process.env.GOOGLE_SHEET_PRIVATE_KEY.replace(/\\n/g, "\n"),
          });

        return doc
    }

    async getRowsGoogleSheetOrder() {

        var data = await this.getDataOrderDitail()
        
        let customerPackage = data.customerPackage
        let customerOrderItem = data.orderItem
        
        // console.log(customerPackage)

        var i = 1
        var rows = []
        var customerAndProductName = []
        for (let item of customerOrderItem) {
            if (item.orderItem_price && item.orderItem_price > 0 && item.product_type != 2 && item.product_type) {
                let priceOneUsing = item.orderItem_price * item.orderItem_quantity - item.orderItem_discount
                let row  =  {
                    "Tên KH": item.customer_full_name,
                    "Ngày tạo KH": item.customer_created_at,
                    "Sđt":item.customer_mobile,
                    "Dịch vụ đã mua":  item.orderItem_product_name,
                    "Mã bill": item.order_order_code,
                    "Nhóm dịch vụ": item.category_name,
                    "Số buổi đã dùng": 1,
                    "Số buổi còn lại": 0,
                    "Tổng số buổi": 1,
                    "Ngày tạo": item.order_order_at,
                    "Lần dùng gần nhất":item.order_order_at,
                    "Số tiền cho một lần sử dụng":  priceOneUsing ? priceOneUsing : 0,
                    "Tổng tiền":  item.orderItem_price * item.orderItem_quantity - item.orderItem_discount,
                    "Số tiền đã sử dụng": priceOneUsing ? priceOneUsing : 0,
                    "Số tiền còn nợ khách": 0
                }  
                rows.push(row)
            } else {
                if (item.orderItem_package_code && customerPackage[item.orderItem_package_code] && typeof customerPackage[item.orderItem_package_code] != 'undefined'){
                    if(new Date(item.order_order_at) > new Date(customerPackage[item.orderItem_package_code]['Lần dùng gần nhất'])) {
                        customerPackage[item.orderItem_package_code]['Lần dùng gần nhất'] = item.order_order_at
                    }
                }
            }
        }
        var dataPackage = []
        dataPackage.push(Object.values(customerPackage))
        let dataT = dataPackage[0].concat(rows)

        let total = {
            "Tên KH": "Tổng",
            "Ngày tạo KH": "",
            "Sđt": "",
            "Dịch vụ đã mua": "",
            "Mã bill": "",
            "Nhóm dịch vụ": "",
            "Số buổi đã dùng": "",
            "Số buổi còn lại": "",
            "Tổng số buổi": "",
            "Lần dùng gần nhất": "",
            "Số tiền cho một lần sử dụng":  _.sumBy(dataT, 'Số tiền cho một lần sử dụng')            ,
            "Tổng tiền":   _.sumBy(dataT, 'Tổng tiền') ,
            "Số tiền đã sử dụng":  _.sumBy(dataT, 'Số tiền đã sử dụng'),
            "Số tiền còn nợ khách":  _.sumBy(dataT, 'Số tiền còn nợ khách'),
        }
         _.orderBy(dataT, ['Tên KH'], ['asc']);
        dataT.push(total)
        return dataT
        
    }


    async getDataOrderDitail() {

        var customerPackage = await this.customerRepo.createQueryBuilder('customer')
            .where('customer.soft_delete IS NULL')
            .leftJoinAndSelect('customer.packages', 'packages')
            .leftJoinAndSelect('packages.product', 'product')
            .leftJoinAndSelect('product.category', 'category')
            .andWhere('packages.soft_delete IS NULL')
            .getRawMany()

        let packages = {}
        for (let item of customerPackage) {
            var priceOneUsing = item.packages_max_used > 100 ? 0 : item.packages_sale_card / item.packages_max_used
            let priceUsing = priceOneUsing * item.packages_count_used
            let priceOwed = priceOneUsing * item.packages_max_used - priceOneUsing * item.packages_count_used
            if (item.packages_max_used > 100) {
                priceOwed = item.packages_sale_card
            }
            if (item.packages_status == 3 || item.packages_status == 4) {
                priceOwed = 0
                priceUsing = item.packages_sale_card
            }

           if (item.packages_id) {
            let  row = {
                "Tên KH": item.customer_full_name,
                "Ngày tạo KH": item.customer_created_at,
                "Sđt":item.customer_mobile,
                "Dịch vụ đã mua":  item.packages_product_name,
                "Mã bill": item.packages_order_code,
                "Nhóm dịch vụ": item.category_name,
                "Số buổi đã dùng": item.packages_count_used,
                "Số buổi còn lại": "",
                "Tổng số buổi": item.packages_max_used > 100 ? "Vĩnh viên" : item.packages_max_used,
                "Số tiền cho một lần sử dụng":  priceOneUsing,
                "Ngày tạo": item.packages_created_at,
                "Số tiền đã sử dụng": priceUsing ? priceUsing : 0,
                "Số tiền còn nợ khách": priceOwed ? priceOwed : 0,
                "Lần dùng gần nhất":item.packages_created_at,
                "Tổng tiền":  item.packages_sale_card,
            }
            packages[item.packages_package_code] = row
           }
        }

        var dataCustomerOrderItem =  await this.customerRepo.createQueryBuilder('customer')
            .where('customer.soft_delete IS NULL')
            .leftJoinAndSelect('customer.order', 'order')
            .andWhere('order.soft_delete IS NULL')
            .innerJoinAndSelect('order.orderItem', 'orderItem')
            .innerJoinAndSelect('orderItem.product', 'product')
            .leftJoinAndSelect('product.category', 'category')
            .getRawMany()


        return {customerPackage: packages, orderItem: dataCustomerOrderItem}
    }


}
