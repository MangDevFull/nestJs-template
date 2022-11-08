import { Injectable, Query } from '@nestjs/common';
import { Package } from 'src/package/package.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult, DeleteResult, NotBrackets, Brackets, MoreThan, LessThanOrEqual, IsNull } from 'typeorm';
import { format, startOfDay, endOfDay } from 'date-fns'
import * as constant from "./constant/constant"
import { Workbook } from 'exceljs'
import { PackageListParam } from './interface/package.interfaces';
import * as AWS from "aws-sdk";
import * as dotenv from 'dotenv';
import { query } from 'express';
import * as helper from './../helpers/response';

let _ = require('lodash');
dotenv.config();

@Injectable()
export class ExportService {
    constructor(

        @InjectRepository(Package)
        private readonly packageRepo: Repository<Package>,


    ) { }

    dataFile
    async exportPackage(param: PackageListParam) {
        try {
            var rows = []
            var data = constant.headerValuesReportPackage
            rows.push(Object.values(data))
            var dataRowCustomers = await this.getRows(param)
            for (let row of dataRowCustomers) {
                rows.push(Object.values(row))
            }
            var urlS3 = await this.uploadFile(rows, "Bao_cao_the_khach_hang")
            return helper.success({
                url: urlS3,
            })
        } catch (err) {
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
                    secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
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
                s3.upload(params, function (s3Err, data) {
                    if (s3Err) throw s3Err
                });
            });
            await new Promise(r => setTimeout(r, 1000));
            var urlS3 = process.env.REACT_APP_S3_URL + name
            return urlS3
        } catch (e) {
            console.log(e)
            return false
        }

    }

    async getRows(query) {

        var packageDetails = await this.getDataPackageDetail(query)
        var i = 1
        var rowPackages = [];

        for (let item of packageDetails) {
            let rowPackage =  {
                package_code: item.package_package_code,
                full_name: item.customer_full_name,
                mobile: item.customer_mobile,
                customer_code: item.customer_code,
                product_names: item.package_product_name ? item.package_product_name : item.product_product_name,
                created_package: item.package_created_at,
                expiration_date: item.package_expiration_date,
                order_code: item.package_order_code,
                count_used: item.package_count_used,
                max_used: item.package_max_used,
                updated_at: item.package_updated_at,
                sale_card: item.package_sale_card,
                status: constant.listStatusBooking[item.package_status],
                store: item.store_name_store,
                node: item.package_note_package
            }
            rowPackages.push(rowPackage)
            i ++ ;

        }
        var data = []
        data.push(Object.values(rowPackages))

        return data[0]

    }

    async getDataPackageDetail(param) {

        var query = this.packageRepo.createQueryBuilder('package')
            .where("package.soft_delete IS NULL")
            .innerJoinAndSelect("package.customer", "customer")
            .leftJoinAndSelect("package.product", "product")
            .innerJoinAndSelect("package.store", "store")
            .orderBy("customer.id", "DESC");

        if (param.keyword_card && typeof param.keyword_card) {

            query = query.andWhere(new Brackets(qb => {
                qb.where("package.package_code like :keyword", { keyword: `%${param.keyword_card}%` })
                    .orWhere("package.product_name like :product_name", { product_name: `%${param.keyword_card}%` })
            }))
        }
        if (param.store_id && typeof param.store_id && param.store_id != 0) {
            query = query.andWhere('package.store_id =:storeId', { storeId: param.store_id })
        }
        if (param.keyword_customer && typeof param.keyword_customer) {
            query = query.andWhere(new Brackets(qb => {
                qb.where("customer.full_name like :full_name", { full_name: `%${param.keyword_customer}%` })
                    .orWhere("customer.email like :email", { email: `%${param.keyword_customer}%` })
                    .orWhere("customer.mobile like :mobile", { mobile: `%${param.keyword_customer}%` })
            }))
        }

        if (param.type && typeof param.type) {
            query = query.andWhere('package.type = :type', { storeId: param.type })
        }
        if (param.status && typeof param.status && param.status != 0 && param.status < 5) {
            query = query.andWhere('package.status = :status', { status: param.status })
        }

        if (param.status > 4) {
            var newDate = new Date();
            if (param.status == 5) {
                var endDate = new Date();
                endDate.setMonth(endDate.getMonth() + 1);
            } else {
                var endDate = new Date();
                endDate.setDate(endDate.getDate() + 7);
            }
            query = query.andWhere(
                'package.expiration_date BETWEEN :start_at AND :end_at',
                { start_at: startOfDay(newDate), end_at: endOfDay(endDate) })
        }

        if (param.start && typeof param.start && param.end && typeof param.end) {
            let startDay = new Date(param.start),
                endDay = new Date(param.end);
            query = query.andWhere(
                'package.date_of_issue BETWEEN :start_at AND :end_at',
                { start_at: startOfDay(startDay), end_at: endOfDay(endDay) })
        }
        var packageDetails = await query.getRawMany()

        return packageDetails
    }


}
