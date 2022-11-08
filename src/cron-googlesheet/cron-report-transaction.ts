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
export class handleCronReportTransaction {
    constructor(

        @InjectRepository(OrderItem,process.env.DB_REPORT_CONNECT_NAME)
        private readonly orderItemRepo: Repository<OrderItem>,

    ) { }


    @Cron('0 */10 * * * *')
    async handleCronRportTransaction() {
        const doc = await this.connectGoogleSheet(process.env.GOOGLE_SHEET_DOC_REPORT_TRANSACTION)
        await doc.loadInfo();
        
        var rowsNew = await this.getRowsGoogleSheetOrder()
        // console.log(rowsNew)

        //sheet Khách hàng
        const sheetsCustomer = doc.sheetsByIndex[0];
        console.log(sheetsCustomer.title)
        await sheetsCustomer.clearRows();
        var rowCustomers = _.chunk(rowsNew, 10000)
        for(let row of rowCustomers) {
            await sheetsCustomer.addRows(row);
            console.log(1)
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(true)
    }

    
    async connectGoogleSheet(docKey: String) {
        const { GoogleSpreadsheet } = require('google-spreadsheet');

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_DOC_REPORT_TRANSACTION);
        await doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_SHEET_IMAIL,
            client_id: process.env.GOOGLE_SHEET_ID,
            private_key: process.env.GOOGLE_SHEET_PRIVATE_KEY.replace(/\\n/g, "\n"),
          });

        return doc
    }

    async getRowsGoogleSheetOrder() {

        var orderDetails = await this.getDataOrder()

        var i = 1
        var rowCustomer = []
        for (let item of orderDetails) {
               
                let row  =  {
                    "STT": i,
                    "Mã chứng từ": item.order_order_code,
                    "Ngày": item.order_order_at,
                    "Sale": item.order_source_from,
                    "KTV TV 1": item.order_item_employee_service_name1,
                    "KTV TV2": item.order_item_employee_service_name2,
                    "KTV PV 1": item.order_item_employee_consultant_name1,
                    "KTV PV 2": item.order_item_employee_consultant_name2,
                    "Thu ngân":  item.order_created_name,
                    "Khách hàng":item.customers_full_name,
                    "Dịch vụ sử dụng": item.order_item_product_name ? item.order_item_product_name : item.User_name,
                    "Phương thức thanh toán (TM/bank)": item.order_payment_type,
                }

                rowCustomer.push(row)
                i ++ ;
        }

        return rowCustomer
        
    }

    async getDataOrder() {
        var orderDetails = await this.orderItemRepo.createQueryBuilder('order_item')
        .innerJoinAndSelect("order_item.order", "order")
        .leftJoinAndSelect("order.customers", "customers")
        .leftJoinAndSelect("order_item.product", "product")
        .leftJoinAndSelect("order.User", "User")
        .andWhere("order.status = 3")
        .orderBy("order.order_at", "DESC")
        .getRawMany()

        return orderDetails
    }

}
