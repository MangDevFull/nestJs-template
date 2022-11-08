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
import { Transaction } from 'src/transaction/transaction.entity';
import * as constant from "./constant/constant"
import * as dotenv from 'dotenv';
import { query } from 'express';
let _ = require('lodash');

@Injectable()
export class handleCronReportCustomerUnrealizedRevenueReport {
    constructor(

        @InjectRepository(Order,process.env.DB_REPORT_CONNECT_NAME)
        private readonly orderRepo: Repository<Order>,

    ) { }


    @Cron('0 */10 * * * *')
    async handleCronReportFormCustomer() {
        const doc = await this.connectGoogleSheet(process.env.GOOGLE_SHEET_DOC_REPORT_RECEIVABLE_FROM_CUSTOMERS)
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
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(true)
    }

    
    async connectGoogleSheet(docKey: String) {
        const { GoogleSpreadsheet } = require('google-spreadsheet');

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_DOC_REPORT_RECEIVABLE_FROM_CUSTOMERS);
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
        var rowCustomer = [],  orderIds = [], rowOweds = [], j = 1;
        for (let item of orderDetails) {
                let row  =  {
                    "STT": i,
                    "Mã chứng từ": item.order_code,
                    "Ngày": item.order_at,
                    "Sale": item.source_from,
                    "Thu ngân": item.created_name,
                    "Khách hàng": item.customers.full_name,
                    "Nợ đầu kỳ": "",
                    "Phát sinh phải thu trong kỳ": "",
                    "Đã thanh toán trong kỳ": "",
                    "Còn phải thu":  item.money_owed,
                    "ngày thanh toán": item.order_at,
                    "số tiền trả này": item.total_price,
                    "còn nợ": item.money_owed,
                    "phương thức thanh toàn": item.payment_type,
                }

                rowCustomer.push(row)
                i ++ ;
        }

        return rowCustomer
        
    }

    async getDataOrder() {

        var orderTransaction = await this.orderRepo.createQueryBuilder('order')
        .where("order.money_owed > 0")
        .andWhere("order.soft_delete IS NULL")
        .innerJoinAndSelect("order.stores", "stores")
        .innerJoinAndSelect("order.customers", "customers")
        .leftJoinAndSelect("order.transaction", "transaction")
        .andWhere("order.status = 3")
        .getMany()
        return orderTransaction
    }

}
