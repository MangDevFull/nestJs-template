import { Injectable, Query } from '@nestjs/common';
import { Package } from 'src/package/package.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult, DeleteResult, NotBrackets, Brackets, MoreThan, LessThanOrEqual, IsNull } from 'typeorm';
import { format, startOfDay, endOfDay } from 'date-fns'
import { Customer } from 'src/customers/entities/customers.entity';
import { Order } from 'src/orders/entities/orders.entity';
import * as constant from "./constant/constant"
import { Workbook } from 'exceljs'
import * as AWS from "aws-sdk";
import * as dotenv from 'dotenv';
import { query } from 'express';
let _ = require('lodash');
dotenv.config();

@Injectable()
export class ExportService {
    constructor(

        @InjectRepository(Customer)
        private readonly customerRepo: Repository<Customer>,

        @InjectRepository(Order)
        private readonly orderRepo: Repository<Order>,


    ) { }

    dataFile
    async exportCustomer(query) {
        try{
            var rows = []
            var data = constant.headerValuesReportCustomer
            rows.push(Object.values(data))
            var dataRowCustomers = await this.getRows(query)
            var i = 1;
            for (let row of dataRowCustomers) {
                row.id = i;
                rows.push(Object.values(row))
                i ++
            }
            var urlS3 = await this.uploadFile(rows, "Bao_cao_khach_hang")
            return urlS3

        } catch(err) {
            console.log(err)
        }
       
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
             await new Promise(r => setTimeout(r, 1100));
                var urlS3 = process.env.REACT_APP_S3_URL + name
            return urlS3
        } catch (e) {
            console.log(e)
            return false
        }

    }

    async getRows(query) {

        var orderDetails = await this.getDataOrderDitail(query)
        var i = 1
        var cuntomerIds = [], rowCustomer = [];
    
        for (let item of orderDetails) {
            if (!cuntomerIds.includes(item.customers_id)) {

                rowCustomer[item.customers_id] =  {
                    id: i,
                    full_name: item.customers_full_name,
                    mobile: item.customers_mobile,
                    product_names:item.orderItem_product_name,
                    total_monney:  item.orderItem_price * item.orderItem_quantity - item.orderItem_discount,
                    birthday: item.customers_birthday,
                    custmer_at: item.customers_created_at,
                    loyalty_point: item.customers_loyalty_point,
                    ranking: constant.optionsRanking[item.customers_ranking],
                    lastOrder: item.order_order_at
                }
                cuntomerIds.push(item.customers_id)
                i ++ ;
            } else {
                if (item.orderItem_price > 0 && item.order_total_price > 0) {
                    rowCustomer[item.customers_id].product_names = rowCustomer[item.customers_id].product_names + ', ' + item.orderItem_product_name
                    rowCustomer[item.customers_id].total_monney = rowCustomer[item.customers_id].total_monney + item.orderItem_price * item.orderItem_quantity - item.orderItem_discount
                }
                if (new Date(item.order_order_at) > new Date(rowCustomer[item.customers_id].lastOrder)) {
                    rowCustomer[item.customers_id].lastOrder = item.order_order_at
                }
            }

        }
        var data = []
        data.push(Object.values(rowCustomer))
      
        return data[0]
        
    }

    async getDataOrderDitail(query) {

        var  orderQuery=  this.orderRepo.createQueryBuilder('order')
        .where("order.soft_delete IS NULL")
        .innerJoinAndSelect("order.stores", "stores")
        .innerJoinAndSelect("order.customers", "customers")
        .leftJoinAndSelect("order.User", "User")
        .leftJoinAndSelect("order.updatedBy", "updatedBy")
        .leftJoinAndSelect("order.orderItem", "orderItem")
        .leftJoinAndSelect("orderItem.product", "product")
        .andWhere("order.status = 3")
        
        if (query.startOrderAt && query.endOrderAt && typeof query.startOrderAt != "undefined" && typeof query.endOrderAt != "undefined") {
            let start = new Date(query.startOrderAt)
            let end = new Date(query.endOrderAt)
            orderQuery = orderQuery.andWhere(
                'order.order_at BETWEEN :start_at AND :end_at',
                { start_at: startOfDay(start), end_at: endOfDay(end) })
        }

        if (query.startCustomer && query.endCustomer && typeof query.startCustomer != "undefined" && typeof query.endCustomer != "undefined") {
            let start = new Date(query.startCustomer)
            let end = new Date(query.endCustomer)
            orderQuery = orderQuery.andWhere(
                'customers.created_at BETWEEN :start_at AND :end_at',
                { start_at: startOfDay(start), end_at: endOfDay(end) })
        }

        var orderDetails = await orderQuery.getRawMany()

        return orderDetails
    }


}
