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
export class CronCustomerDebtService {
    constructor(
        @InjectRepository(Order,process.env.DB_REPORT_CONNECT_NAME)
        private readonly orderRepo: Repository<Order>,
    ) { }


    @Cron('0 */10 * * * *')
    async handleCronCustomer() {
        const doc = await this.connectGoogleSheet(process.env.GOOGLE_SHEET_DOC_KEY_CUSTOMER_OWLD)
        await doc.loadInfo();
        
        var rowsNew = await this.getRowsGoogleSheetOrder()
        // console.log(rowsNew)

        //sheet Khách hàng
        const sheetsCustomer = doc.sheetsByIndex[0];
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

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_DOC_KEY_CUSTOMER_OWLD);
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
                let ms2 = new Date()
                let orderAt = item.order_at.getFullYear() + "-" + 
                    (item.order_at.getMonth() + 1) + '-' + 
                    item.order_at.getDate() + " " + item.order_at.getHours() + ":" + item.order_at.getMinutes()
                let totalDateOwed = Math.ceil((ms2.getTime() - item.order_at.getTime()) / (24*60*60*1000))
                let aboutOwed = ''
                if (totalDateOwed < 90) {
                    aboutOwed =  "<3 Tháng"
                } else if (totalDateOwed >= 90 && totalDateOwed < 180) {
                    aboutOwed = "3-6 tháng"
                } else if (totalDateOwed >= 180 && totalDateOwed <= 365) {
                    aboutOwed = "6-12 tháng"
                } else {
                    aboutOwed = ">1 năm"
                }
                let row  =  {
                    "STT": i,
                    "Ngày": item.order_at,
                    "Khách hàng":item.customers ? item.customers.full_name :  '' ,
                    "Sđt khách hàng": item.customers ? item.customers.mobile : '',
                    "Mã đơn hàng":  item.order_code,
                    "Số tiền nợ": item.money_owed,
                    "Số ngày nợ": totalDateOwed,
                    "Khoảng nợ": aboutOwed
                }

                rowCustomer.push(row)
                i ++ ;
        }

        return rowCustomer
        
    }

    async getDataOrder() {
        var orderDetails = await this.orderRepo.createQueryBuilder('order')
        .where("order.soft_delete IS NULL")
        .innerJoinAndSelect("order.stores", "stores")
        .innerJoinAndSelect("order.customers", "customers")
        .andWhere("order.status = 3")
        .andWhere("order.money_owed > 0")
        .getMany()
        return orderDetails
    }

}
