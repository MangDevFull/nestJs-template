import { Injectable } from '@nestjs/common';
import { Booking } from '../entities/bookings.entity'
import { User } from '../../users/users.entity'
import { Order } from 'src/orders/entities/orders.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, Brackets } from 'typeorm';
import * as helper from '../../helpers/response';
import { format, startOfDay, endOfDay } from 'date-fns'
import { Store } from '../../stores/stores.entity'
import { Customer } from '../../customers/entities/customers.entity';
import { UsersService } from "../../users/users.service";
import * as constant from "../constant/constant"
import { Workbook } from 'exceljs'
import * as AWS from "aws-sdk";
import * as dotenv from 'dotenv';
import { query } from 'express';
let _ = require('lodash');
dotenv.config();

@Injectable()
export class ExportBookingHistoryService {
    constructor(
        @InjectRepository(Booking)
        private readonly bookingRepo: Repository<Booking>,

        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        private userService: UsersService,

        @InjectRepository(Store)
        private readonly storeRepo: Repository<Store>,

        @InjectRepository(Customer)
        private readonly customerRepo: Repository<Customer>,

        @InjectRepository(Order)
        private readonly orderRepo: Repository<Order>,


    ) { }

    dataFile
    async exportBooking(params: any) {
        try{
            var rows = []
            var data = constant.headerValuesReportBooking
            rows.push(Object.values(data))
            var dataRowCustomers = await this.getRows(params)
            
            for (let row of dataRowCustomers) {
                rows.push(Object.values(row))
            }
            var urlS3 = await this.uploadFile(rows, "Lich_Su_dat_lich")
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
            await new Promise(r => setTimeout(r, 1500));
            var urlS3 = process.env.REACT_APP_S3_URL + name
            return urlS3
        } catch (e) {
            console.log(e)
            return false
        }

    }

    async getRows(query) {

        let newDate = new Date
        var start = new Date(newDate.setHours(0, 0, 0, 0))
        var end = new Date(newDate.setHours(0, 0, 0, 0))
        end.setDate(end.getDate() + 1);
        if (query.start && typeof query.start && query.end && typeof query.end) {
            start = new Date(query.start)
            end = new Date(query.end)
        }

        let bookings = await this.getDataBooking(query, start, end)

        var idBookings = []

        if (bookings.length > 0) {
            for (let item of bookings) {
                idBookings.push(item.booking_id)
            }
        }

        var orders = await this.getDataOrder(idBookings)
        var data = []

        for(let item of bookings) {

            var service = ''
            var userService = ''

            if (item.booking_booking_item.length) {
                var dataBookingItem = await this.getDetailBooking(item.booking_booking_item)
                service = dataBookingItem[0]
                userService = dataBookingItem[1]
            }
            var customer_new_old = "Khách quay lại"
            if (item.customers_created_at < end && item.customers_created_at > start) {
                customer_new_old = "Khách mới"
            }

            let booking = {
                booking_code: item.booking_book_code,
                booking_date: item.booking_book_date,
                customer_name: item.customers_full_name,
                customer_mobile: item.customers_mobile,
                customer_address: (item.customers_country ? item.customers_country + ',' : '') + item.customers_city ?? '',
                type_customer: customer_new_old,
                booking_status: constant.bookingStatus[item.booking_book_status],
                source_from: constant.optionsSourceBooking[item.booking_source_from],
                count_number: item.booking_booking_item.length,
                service: service,
                user_service: userService,
                create_user: item.user_name,
                created_at: item.booking_created_at,
                order_code: (orders[item.booking_id] && orders[item.booking_id] != undefined) ? orders[item.booking_id].order_code : '',
                store: item.stores_name_store,
                node: item.booking_description,
            }

            data.push(booking)
        }

        var datas = []
        datas.push(Object.values(data))

        return datas[0] 

    }
    async getDetailBooking(array) {
        var service = []
        var useService = []
        for (let item of array) {
            if (item.product_ids.length > 0) {
                for(let itemPro of item.product_ids) {
                    if (typeof itemPro.product_name != 'undefined') {
                        service.push(itemPro.product_name)
                    }
                    if (typeof itemPro.name != 'undefined') { 
                        service.push(itemPro.name)
                    }
                }
            }
            if (item.user_ids.length > 0) {
                for(let itemUser of item.user_ids) {
                    useService.push(itemUser.name)
                }
            }
        }
        
        service = _.uniq(service)
        useService = _.uniq(useService)

        return [_.join(service, ','), _.join(useService, ',')]

    }
    

    async getDataBooking(query, start, end) {
        var bookings = this.bookingRepo.createQueryBuilder('booking')
        .where('booking.soft_delete IS NULL')
        .innerJoinAndSelect('booking.customers', 'customers')
        .innerJoinAndSelect('booking.stores', 'stores')
        .leftJoinAndMapOne("booking.user", User, 'user', 'booking.created_by = user.id')
        // .leftJoinAndMapOne("booking.order", Order, 'order', 'booking.id = order.id_booking')
        .orderBy('booking.book_date', 'DESC')


        if (query.store_id && typeof query.store_id != "undefined") {
            bookings = bookings.andWhere('stores.id = :store_id', {store_id: query.store_id})
        }
        if (query.keyword && typeof query.keyword != "undefined") {
            bookings = bookings.andWhere(new Brackets(qb => {
                qb.where("customers.full_name like :full_name", { full_name: `%${query.keyword}%` })
                  .orWhere("customers.email like :email", { email: `%${query.keyword}%` })
                  .orWhere("customers.mobile like :mobile", { mobile: `%${query.keyword}%` })
                  .orWhere("booking.book_code like :book_code", { book_code: `%${query.keyword}%` })
            }))
        }

        console.log(query.status)
        if (query.status && typeof query.status != "undefined") {
            bookings = bookings.andWhere('booking.book_status = :status', {status: query.status})
        }

        if (query.source && typeof query.source != "undefined") {
            bookings = bookings.andWhere('booking.source_from = :source', {source: query.source})
        }

        bookings = bookings.andWhere(
            'booking.book_date BETWEEN :start_at AND :end_at',
            { start_at: startOfDay(start), end_at: endOfDay(end) })


        if (query.create_booking && typeof query.create_booking != "undefined") {
            bookings = bookings.andWhere('booking.created_by = :createdBy', {createdBy: query.create_booking})
        }
        var dataBooking = await bookings.getRawMany()


        return dataBooking
    }

    async getDataOrder(ids) {
        var orders = await this.orderRepo.find({
            where: {
                soft_delete: IsNull(),
                id_booking: In(ids)
            },
            select: {
                id_booking: true,
                id: true,
                order_code: true,
            }
        })

        var data = {}
        for(let item of orders) {
            data[item.id_booking] = item
        }
        
        return data
    }
}