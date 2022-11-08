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
export class CronService {
    constructor(
        @InjectRepository(Order,process.env.DB_REPORT_CONNECT_NAME)
        private readonly orderRepo: Repository<Order>,


    ) { }


    @Cron('0 */10 * * * *')
    async handleCronCustomer() {
        const doc = await this.connectGoogleSheet(process.env.GOOGLE_SHEET_DOC_KEY)
        await doc.loadInfo();

        var rowsNew = await this.getRowsGoogleSheet()

        //sheet Khách hàng
        const sheetsCustomer = doc.sheetsByIndex[1];
        await sheetsCustomer.clearRows();
        var rowCustomers = _.chunk(rowsNew.customer, 20000)
        for(let row of rowCustomers) {
            await sheetsCustomer.addRows(row);
            await new Promise(r => setTimeout(r, 1000));
            console.log(1)
        }

        // sheet Tuổi nợ
        const sheetsOwed = doc.sheetsByIndex[2];
        await sheetsOwed.clearRows();
        var orderOweds = _.chunk(rowsNew.orderOwed, 20000)
        for(let row of orderOweds) {
            await sheetsOwed.addRows(row);
            await new Promise(r => setTimeout(r, 1000));
            console.log(1)
        }

        console.log(true)
    }

    
    async connectGoogleSheet(docKey: String) {
        const { GoogleSpreadsheet } = require('google-spreadsheet');

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_DOC_KEY);
        await doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_SHEET_IMAIL,
            client_id: process.env.GOOGLE_SHEET_ID,
            private_key: process.env.GOOGLE_SHEET_PRIVATE_KEY.replace(/\\n/g, "\n"),
          });

        return doc
    }

    async addSheetStore() {
        const doc = await this.connectGoogleSheet(process.env.GOOGLE_SHEET_DOC_KEY)
        await doc.loadInfo();
        const sheets = doc.sheetsByIndex[0]
        
        if (sheets.title != "Báo cáo thu tiền" ) {
            await sheets.delete()
            await doc.addSheet({ title: "Báo cáo thu tiền" , headerValues: constant.headerValuesReportCustomer});
        }
    }

    async getRowsGoogleSheet() {

        var orderDetails = await this.getDataOrderDitail()
        var i = 1
        var cuntomerIds = [], rowCustomer = [],  orderIds = [], rowOweds = [], j = 1;
    
        for (let item of orderDetails) {
            if (!cuntomerIds.includes(item.customers_id)) {

                rowCustomer[item.customers_id] =  {
                    "STT": i,
                    "Tên": item.customers_full_name,
                    "SĐT": item.customers_mobile,
                    "Dịch vụ đã mua":item.orderItem_product_name,
                    "Tổng chi tiêu":  item.orderItem_price * item.orderItem_quantity - item.orderItem_discount,
                    "Sinh nhật": item.customers_birthday,
                    "Ngày tạo": item.order_order_at,
                    "Điểm thưởng": item.customers_loyalty_point,
                    "Hạng": constant.optionsRanking[item.customers_ranking]
                }
                cuntomerIds.push(item.customers_id)
                i ++ ;
            } else {
                rowCustomer[item.customers_id]['Dịch vụ đã mua'] = rowCustomer[item.customers_id]['Dịch vụ đã mua'] + ', ' + item.orderItem_product_name
                rowCustomer[item.customers_id]['Tổng chi tiêu'] = rowCustomer[item.customers_id]['Tổng chi tiêu'] + item.orderItem_price * item.orderItem_quantity - item.orderItem_discount
            }

            if (!orderIds.includes(item.order_id) && item.order_money_owed > 0) {
                let rowOwed = {
                    "STT": j,
                    "Mã đơn hàng": item.order_order_code,
                    "Khách hàng": item.customers_full_name,
                    "Số tiền nợ": item.order_money_owed,
                    "Thời gian nợ": item.order_order_at,
                    "SĐT": item.customers_mobile
                }
                orderIds.push(item.order_id)
                rowOweds.push(rowOwed)
                j ++;
            }
        }
        var data = []
        data.push(Object.values(rowCustomer))
        return {customer: data[0], orderOwed: rowOweds}
        
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
        .andWhere("order.total_price > 0")
        .andWhere("orderItem.price > 0")
        .getRawMany()

        return orderDetails
    }


}
