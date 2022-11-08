import { Injectable } from '@nestjs/common';
import { Booking } from '../entities/bookings.entity'
import { User } from '../../users/users.entity'
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, Brackets } from 'typeorm';
import * as helper from '../../helpers/response';
import { format, startOfDay, endOfDay } from 'date-fns'
import { Store } from '../../stores/stores.entity'
import { Customer } from '../../customers/entities/customers.entity';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UpdateBookingDto } from '../dto/update-booking.dto';
import { plainToClass } from '@nestjs/class-transformer';
import { UsersService } from "../../users/users.service"
let _ = require('lodash');
const axios = require('axios').default;
import { LooseObject } from "../../../interfaces/looseObject.interface"

@Injectable()
export class BookingService {
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
  ) { }

  async getListBooking(id_store: number, params: any) {
    try {
      let startDay = new Date(params.start_date),
        endDay = new Date(params.end_date);

      let dataBooking = await this.getAllBooking(id_store, startDay, endDay);

      return helper.success(dataBooking);
    } catch (error) {
      return helper.error(error, "booking.service")
    }
  }

  async createBooking(createBookingDto: CreateBookingDto, user) {
    try {
      //Create repo store
      let dataStore: any;
      let dataCustomer: any;
      if (createBookingDto.stores) dataStore = this.storeRepo.create({ id: createBookingDto.stores })

      //Create or Edit customer
      let dataUpdateCustomer = {
        full_name: createBookingDto.customers.full_name,
        address: createBookingDto.customers.address,
        city: createBookingDto.customers.city,
        district: createBookingDto.customers.district,
        gender: createBookingDto.customers.gender,
        mobile: createBookingDto.customers.mobile,
        contactId: ""
      }

      if (createBookingDto.customers.id !== "") {
        let updatePayload: LooseObject = {
          ...createBookingDto.customers
        }
        await axios({
          method: 'get',
          url: `${process.env.CARESOFT_URL}/contactsByPhone?phoneNo=${createBookingDto.customers.mobile}`,
          headers: {
            'Authorization': `Bearer ${process.env.CARESOFT_TOKEN}`
          },
        }).then(async (rs) => {
          await axios({
            method: 'put',
            url: `${process.env.CARESOFT_URL}/contacts/${rs.data.contact.id}`,
            headers: {
              'Authorization': `Bearer ${process.env.CARESOFT_TOKEN}`
            },
            data: {
              "contact": {
                "phone_no": createBookingDto.customers.mobile,
                "username": createBookingDto.customers.full_name,
                "gender": createBookingDto.customers.gender - 1
              }
            }
          })
          updatePayload.contactId = rs.data.contact.id.toString()
        })
          .catch(async (err) => {
            const res = await axios({
              method: 'post',
              url: `${process.env.CARESOFT_URL}/contacts`,
              headers: {
                'Authorization': `Bearer ${process.env.CARESOFT_TOKEN}`
              },
              data: {
                "contact": {
                  "phone_no": createBookingDto.customers.mobile,
                  "username": createBookingDto.customers.full_name,
                  "gender": createBookingDto.customers.gender - 1
                }
              }
            })
            const { data } = res
            updatePayload.contactId = data?.contact?.id.toString()
          })
        dataCustomer = await this.customerRepo.save(plainToClass(Customer, updatePayload));
      } else {
        // let checkExitCustomer = await this.customerRepo.findOne({
        //   where:{
        //     soft_delete: IsNull(),
        //     mobile: dataUpdateCustomer.mobile
        //   }
        // })
        // if (checkExitCustomer) {
        //   return  helper.notFound('Khách hàng này đã tồn tại');
        // }
        await axios({
          method: 'post',
          url: `${process.env.CARESOFT_URL}/contacts`,
          headers: {
            'Authorization': `Bearer ${process.env.CARESOFT_TOKEN}`
          },
          data: {
            "contact": {
              "phone_no": createBookingDto.customers.mobile,
              "username": createBookingDto.customers.full_name,
              "gender": createBookingDto.customers.gender - 1
            }
          }
        }).then(res => {
          dataUpdateCustomer.contactId = res.data?.contact?.id.toString()
        })
        dataCustomer = await this.customerRepo.save((dataUpdateCustomer));
      }

      // Create booking
      let booking_item = [];
      if (createBookingDto.booking_item.length > 0) {
        createBookingDto.booking_item.map((item) => {
          booking_item.push({
            'product_ids': item.product_ids,
            'user_ids': item.user_ids,
            'intend_time': item.intend_time
          })
        })
      }
      const bookingData = new Booking();

      bookingData.status = createBookingDto.status,
        bookingData.book_status = createBookingDto.book_status,
        bookingData.description = createBookingDto.description,
        bookingData.created_by = user.id,
        bookingData.updated_by = user.id,
        bookingData.book_date = createBookingDto.book_date,
        bookingData.source_from = createBookingDto.source_from,
        bookingData.intend_time = createBookingDto.intend_time,
        bookingData.booking_item = booking_item,
        bookingData.stores = dataStore,
        bookingData.customers = dataCustomer
      bookingData.isCareSoft = createBookingDto.isCareSoft
      bookingData.ticketId = createBookingDto.ticketId

      let newBooking = await this.bookingRepo.save(bookingData)
      return helper.success(newBooking)
    } catch (error) {
      console.log(error)
      return helper.error("Đã có lỗi xảy ra xin thử lại sau.", "create.booking")
    }
  }

  async updateBooking(id: number, updateBookingDto: UpdateBookingDto, user) {
    try {
      let checkBookingExists = await this.bookingRepo.findOne({
        where: {
          id: id,
          soft_delete: IsNull()
        }
      });

      if (!checkBookingExists) return helper.notFound('Lịch này không tồn tại');

      //Create repo store
      let dataStore: any;
      if (updateBookingDto.stores) dataStore = this.storeRepo.create({ id: updateBookingDto.stores })

      //Create or Edit customer
      let dataUpdateCustomer = updateBookingDto.customers;
      let dataCustomer = await this.customerRepo.save(plainToClass(Customer, dataUpdateCustomer));

      const bookingData = new Booking();

      let booking_item = [];
      if (updateBookingDto.booking_item && updateBookingDto.booking_item.length > 0) {
        if (updateBookingDto.booking_item && updateBookingDto.booking_item.length > 0) {
          updateBookingDto.booking_item.map((item) => {
            booking_item.push({
              'product_ids': item.product_ids,
              'user_ids': item.user_ids,
              'intend_time': item.intend_time
            })
          })
          bookingData.booking_item = booking_item
        }
      }

      bookingData.id = id,
        bookingData.status = updateBookingDto.status,
        bookingData.book_status = updateBookingDto.book_status,
        bookingData.description = updateBookingDto.description,
        bookingData.updated_by = user.id,
        bookingData.book_date = updateBookingDto.book_date,
        bookingData.source_from = updateBookingDto.source_from,
        bookingData.intend_time = updateBookingDto.intend_time,
        bookingData.stores = dataStore,
        bookingData.customers = dataCustomer

      //update booking
      // let bookingData = this.bookingRepo.create({
      //   ...checkBookingExists,
      //   ...updateBookingDto,
      //   stores: dataStore,
      //   customers: dataCustomer,
      // });

      let editBooking = await this.bookingRepo.save(plainToClass(Booking, bookingData));

      return helper.success(editBooking)
    } catch (error) {
      return helper.error(error, "booking.service")
    }
  }

  async convertArrayDate(startDate, endDate) {
    const date = new Date(startDate.getTime());
    let dates = [];

    while (date <= endDate) {
      dates = [...dates, format(new Date(date), "yyyy-MM-dd")];
      date.setDate(date.getDate() + 1);
    }

    return dates;
  }

  async getAllBooking(id, startDate, endDate) {
    let dataBookingNotAsUser = [];
    let dataBookingAsUser = [];
    let dataBookings = await this.bookingRepo.createQueryBuilder('booking')
      .where('booking.soft_delete IS NULL')
      .andWhere('booking.store_id = :id', { id: id })
      .andWhere('booking.book_date BETWEEN :start_at AND :end_at', { start_at: startOfDay(startDate), end_at: endOfDay(endDate) })
      .leftJoinAndSelect("booking.stores", "store_id")
      .leftJoinAndSelect("booking.customers", "customer_id")
      .orderBy('booking.book_date', 'ASC')
      .getMany();

    dataBookings.forEach(function (item) {
      item.booking_item.forEach(function (item_booking) {
        if (item_booking.user_ids.length > 0) {
          dataBookingAsUser.push(item);
        } else {
          dataBookingNotAsUser.push(item);
        }
      })
    })

    dataBookingNotAsUser = _.uniqBy(dataBookingNotAsUser, 'id');

    let bookings = await this.convertBookingByDate(dataBookings, startDate, endDate);
    let bookingNotAsUser = await this.convertBookingByDate(dataBookingNotAsUser, startDate, endDate);
    let bookingAsUser = await this.convertBookingAsUserByDate(id, dataBookingAsUser, startDate, endDate);


    let res = {
      'bookings': {
        data: bookings,
        total: dataBookings.length
      },
      'bookingNotAsUser': {
        data: bookingNotAsUser,
        total: dataBookingNotAsUser.length
      },
      'bookingAsUser': {
        data: bookingAsUser,
        total: dataBookingAsUser.length
      }
    }
    return res;
  }

  async convertBookingByDate(data, startDate, endDate) {
    try {
      let arrayDate = await this.convertArrayDate(startDate, endDate);
      let detailBookingDate = {};
      arrayDate.forEach(function (item) {
        let detailDate = { bookingList: [], total: 0, totalCancel: 0 };
        data.forEach(function (booking) {
          let book_date = format(new Date(booking.book_date), "yyyy-MM-dd")
          if (item === book_date) {
            detailDate.bookingList.push(booking)
            detailDate.total++;
            if (booking.book_status == 6 || booking.book_status == 5) detailDate.totalCancel++
          }
        });

        detailBookingDate[item] = detailDate;
      })

      return detailBookingDate;
    } catch (error) {
      return helper.error(error, "booking.service")
    }
  }

  async convertBookingAsUserByDate(idStore, data, startDate, endDate) {
    try {
      let arrayDate = await this.convertArrayDate(startDate, endDate);
      let listBookingByUser = {};

      //Get id user is key object
      let listUser = await this.userService.getUserByStore(idStore);

      listUser = await _.mapKeys(listUser.data, function (value) {
        return value.id;
      });

      let dataBooking = data;

      let newDataBooking = [];
      dataBooking = dataBooking.map((booking) =>
        booking.booking_item.map((item) =>
          item.user_ids.map((id) =>
            newDataBooking.push({ ...booking, user_id: id.id })
          )
        )
      );

      dataBooking = newDataBooking;

      dataBooking = _.flatten(dataBooking);
      dataBooking = _.groupBy(dataBooking, ({ user_id }) => user_id);

      Object.entries(dataBooking).map((bookingList) => {
        bookingList[1] = _.uniqBy(bookingList[1], 'id');
        let detailBookingDate = { bookings: {} };
        arrayDate.forEach(function (item) {
          let detailDate = { bookingList: [], total: 0, totalCancel: 0 };
          Object.entries(bookingList[1]).map((itemBooking) => {
            if (item === format(new Date(itemBooking[1].book_date), "yyyy-MM-dd")) {
              detailDate.bookingList.push(itemBooking[1])
              detailDate.total++;
              if (itemBooking[1].book_status == 6 || itemBooking[1].book_status == 5) detailDate.totalCancel++
            }
          })
          detailBookingDate.bookings[item] = detailDate;
        })
        listBookingByUser[bookingList[0]] = detailBookingDate
      })

      let resultBooking = _.merge(listUser, listBookingByUser);

      Object.entries(resultBooking).map((bookingList) => {
        if (!bookingList[1]['bookings']) {
          let detailBookingDate = {};
          arrayDate.forEach(function (item) {
            let detailDate = { bookingList: [], total: 0, totalCancel: 0 };
            detailBookingDate[item] = detailDate;
          })
          resultBooking[bookingList[0]].bookings = detailBookingDate
        }
      })

      return resultBooking;
    } catch (error) {
      return helper.error(error, "booking.service")
    }
  }

  async getDetailBooking(id: number) {
    try {
      var resp = await this.bookingRepo.findOne({
        where: {
          id: id,
          soft_delete: IsNull(),
        },
        relations: {
          customers: true,
          stores: true,
        }
      })
      return helper.success(resp);
    } catch (error) {
      return helper.error(error, "booking.service")
    }
  }

  async deleteBooking(id: number) {
    try {
      var booking = await this.bookingRepo.findOne({
        where: {
          id: id,
          soft_delete: IsNull()
        }
      })

      if (!booking) return helper.notFound('Lịch này không tồn tại');

      await this.bookingRepo.update(id, { soft_delete: new Date() })
      return helper.success(booking);
    } catch (error) {
      return helper.error(error, "booking.service")
    }
  }

  async getListBookingHistory(storeId, query) {
    try {
      let newDate = new Date
      var start = new Date(newDate.setHours(0, 0, 0, 0))
      var end = new Date(newDate.setHours(0, 0, 0, 0))
      end.setDate(end.getDate() + 1);
      const takeRecord = query.take || 10;
      const paginate = query.page || 1;
      const skip = (paginate - 1) * takeRecord;

      var bookings = this.bookingRepo.createQueryBuilder('booking')
        .where('booking.soft_delete IS NULL')
        .innerJoinAndSelect('booking.customers', 'customers')
        .innerJoinAndSelect('booking.stores', 'stores')

      if (query.store_id && typeof query.store_id != "undefined") {
        bookings = bookings.andWhere('stores.id = :store_id', { store_id: query.store_id })
      } else {
        bookings = bookings.andWhere('stores.id = :store_id', { store_id: storeId })
      }
      if (query.keyword && typeof query.keyword != "undefined") {
        bookings = bookings.andWhere(new Brackets(qb => {
          qb.where("customer.full_name like :full_name", { full_name: `%${query.keyword}%` })
            .orWhere("customer.email like :email", { email: `%${query.keyword}%` })
            .orWhere("customer.mobile like :mobile", { mobile: `%${query.keyword}%` })
        }))
      }
      if (query.status && typeof query.status != "undefined") {
        bookings = bookings.andWhere('booking.status = :status', { status: query.status })
      }

      if (query.source && typeof query.source != "undefined") {
        bookings = bookings.andWhere('booking.source_from = :source_from', { status: query.source })
      }

      if (query.start && typeof query.start && query.end && typeof query.end) {
        start = new Date(query.start)
        end = new Date(query.end)
      }
      // bookings = bookings.andWhere(
      //   'booking.book_date BETWEEN :start_at AND :end_at',
      //   { start_at: startOfDay(start), end_at: endOfDay(end) })

      if (query.source && typeof query.source != "undefined") {
        bookings = bookings.andWhere('booking.source_from = :source_from', { status: query.source })
      }

      if (query.create_booking && typeof query.create_booking != "undefined") {
        bookings = bookings.andWhere('booking.created_by = :createdBy', { createdBy: query.create_booking })
      }

      var dataBooking = await bookings.take(takeRecord).skip(skip).getMany()

      return helper.success(dataBooking)
    } catch (error) {
      console.log(error)
      return helper.error("Đã có lỗi xảy ra xin thử lại sau.")
    }
  }
  async createBookingForCustomer(createBookingDto: CreateBookingDto) {
    try {
      //Create repo store
      let dataStore: any;
      let dataCustomer: any;
      if (createBookingDto.stores) dataStore = this.storeRepo.create({ id: createBookingDto.stores })

      //Create or Edit customer
      let dataUpdateCustomer = {
        full_name: createBookingDto.customers.full_name,
        address: createBookingDto.customers.address,
        city: createBookingDto.customers.city,
        district: createBookingDto.customers.district,
        gender: createBookingDto.customers.gender,
        mobile: createBookingDto.customers.mobile,
      }

      if (createBookingDto.customers.id !== "") {
        dataCustomer = await this.customerRepo.save(plainToClass(Customer, createBookingDto.customers));
      } else {
        dataCustomer = await this.customerRepo.save((dataUpdateCustomer));
      }


      // Create booking
      let booking_item = [];
      if (createBookingDto.booking_item.length > 0) {
        createBookingDto.booking_item.map((item) => {
          booking_item.push({
            'product_ids': item.product_ids,
            'user_ids': item.user_ids,
            'intend_time': item.intend_time
          })
        })
      }
      const bookingData = new Booking();

      bookingData.status = createBookingDto.status,
        bookingData.book_status = createBookingDto.book_status,
        bookingData.description = createBookingDto.description,
        bookingData.created_by = createBookingDto.created_by,
        bookingData.book_date = createBookingDto.book_date,
        bookingData.source_from = createBookingDto.source_from,
        bookingData.intend_time = createBookingDto.intend_time,
        bookingData.booking_item = booking_item,
        bookingData.stores = dataStore,
        bookingData.customers = dataCustomer

      let newBooking = await this.bookingRepo.save(bookingData)

      return helper.success(newBooking)
    } catch (error) {
      console.log(error)
      return helper.error("Đã có lỗi xảy ra xin thử lại sau.")
    }
  }
  async updateBookingFromWeb(createBookingDto: any, user) {
    try {
      const { booking_items, customer_id, date_book, id, note, book_status, store_id } = createBookingDto;

      if (book_status != 2) {
        return helper.notFound("Không đúng lịch")
      }

      let dataStore: any;
      if (store_id) dataStore = await this.storeRepo.create({ id: store_id })

      //Create or Edit customer
      let dataUpdateCustomer: any;
      if (customer_id) dataUpdateCustomer = await this.customerRepo.create({ id: customer_id })
      let booking_item = [
        {
          'user_ids': [],
          'intend_time': 0,
          'product_ids': JSON.parse(booking_items)
        }
      ]
      const booking = new Booking()
      booking.book_date = date_book
      booking.book_status = book_status
      booking.source_from = 5
      booking.status = book_status
      booking.stores = dataStore
      booking.customers = dataUpdateCustomer
      booking.description = note
      booking.intend_time = 0
      booking.updated_by = user.id
      booking.created_by = user.id
      booking.booking_item = booking_item
      const create = await this.bookingRepo.save(booking)
      if (create) {
        const rs = await axios.put(`${process.env.API_URL_WE}/api/bookings/update/${id}`, { customerId: customer_id, status: "Đã xác nhận" })
        const { data } = rs
        if (data.success) {
          return helper.success(data.data)
        } else {
          return helper.notFound("Có lỗi xảy ra bên booking")
        }
      } else {
        return helper.notFound("Có lỗi xảy ra bên we")
      }

    } catch (error) {
      console.error(error)
      return helper.error(error)
    }
  }

}