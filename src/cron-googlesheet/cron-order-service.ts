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
export class cronOrderService {
    constructor(
        @InjectRepository(Order,process.env.DB_REPORT_CONNECT_NAME)
        private readonly orderRepo: Repository<Order>,


    ) { }

    @Cron('0 */10 * * * *')
    async handleCron() {
        // get doc
        const doc = await this.connectGoogleSheet(process.env.GOOGLE_SHEET_DOC_KEY)
        await doc.loadInfo();
        const sheets = doc.sheetsByIndex[0];
        var rows = await this.addRowSheet()
        rows = _.chunk(rows, 20000)
        await sheets.clearRows();
        for(let row of rows) {
            await sheets.addRows(row);
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


    async addRowSheet() {
        
        var orderDetails =  await this.getDataOrderDitail()

        var rows = []
        var i = 1
        for (let item of orderDetails) {
            var row = {
                "STT": i,
                "Mã hóa đơn": item.order_order_code,
                "Ngày":item.order_order_at,
                "Cơ sở": item.stores_name_store,
                "Dịch vụ": item.orderItem_product_name,
                "Nhóm dịch vụ/ sản phẩm": item.category_name,
                "Doanh thu": item.orderItem_price * item.orderItem_quantity - item.orderItem_discount
            }
        
            i ++ ;
            rows.push(row)
        }

        return rows
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
        .leftJoinAndSelect("product.category", "category")
        .andWhere("order.status = 3")
        .andWhere("orderItem.price != 0")
        .getRawMany()

        return orderDetails
    }


}
