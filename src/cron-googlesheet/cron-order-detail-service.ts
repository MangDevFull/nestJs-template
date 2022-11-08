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
export class CronOrderDetailService {
    constructor(
        @InjectRepository(Order,process.env.DB_REPORT_CONNECT_NAME)
        private readonly orderRepo: Repository<Order>,


    ) { }


    @Cron('0 */10 * * * *')
    async handleCronCustomer() {
        const doc = await this.connectGoogleSheet(process.env.GOOGLE_SHEET_DOC_KEY_COMMISSION)
        await doc.loadInfo();
        
        var rowsNew = await this.getRowsGoogleSheetOrder()
        // console.log(rowsNew)

        //sheet Khách hàng
        const sheetsCustomer = doc.sheetsByIndex[0];
        await sheetsCustomer.clearRows();
        var rowCustomers = _.chunk(rowsNew, 20000)
        for(let row of rowCustomers) {
            await sheetsCustomer.addRows(row);
            await new Promise(r => setTimeout(r, 1000));
            console.log(1)
        }

        console.log(true)
    }

    
    async connectGoogleSheet(docKey: String) {
        const { GoogleSpreadsheet } = require('google-spreadsheet');

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_DOC_KEY_COMMISSION);
        await doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_SHEET_IMAIL,
            client_id: process.env.GOOGLE_SHEET_ID,
            private_key: process.env.GOOGLE_SHEET_PRIVATE_KEY.replace(/\\n/g, "\n"),
          });

        return doc
    }

    async getRowsGoogleSheetOrder() {

        var orderDetails = await this.getDataOrderDitail()
        var i = 1
        var rowCustomer = []
        for (let item of orderDetails) {
                
               let row  =  {
                    "STT": i,
                    "Mã chứng từ": item.order_order_code,
                    "Ngày":item.order_order_at,
                    "Sale":  item.order_source_from,
                    "KTV PV 1": item.orderItem_employee_service_name1,
                    "KTV PV 2": item.orderItem_employee_service_name2,
                    "KTV TV 1": item.orderItem_employee_consultant_name1,
                    "KTV TV 2":item.orderItem_employee_consultant_name2,
                    "Thu ngân":  item.User_name ? item.User_name : item.order_created_name,
                    "Khách hàng": item.customers_full_name,
                    "Dịch vụ sử dụng": item.product_product_name,
                    "Mã giảm giá":  "",
                    "Tổng doanh thu": item.orderItem_price * item.orderItem_quantity - item.orderItem_discount,
                    "Chiết khấu bằng tiền": "",
        
                }
                rowCustomer.push(row)
                i ++ ;
        }

        return rowCustomer
        
    }


    async getDataOrderDitail() {
        var orderDetails = await this.orderRepo.createQueryBuilder('order')
        .where("order.soft_delete IS NULL")
        .innerJoinAndSelect("order.stores", "stores")
        .innerJoinAndSelect("order.customers", "customers")
        .leftJoinAndSelect("order.User", "User")
        .leftJoinAndSelect("order.updatedBy", "updatedBy")
        .leftJoinAndSelect("order.orderItem", "orderItem")
        .leftJoinAndSelect("orderItem.product", "product")
        .andWhere("order.status = 3")
        // .andWhere("order.total_price > 0")
        // .andWhere("orderItem.price > 0")
        .getRawMany()

        return orderDetails
    }

}
