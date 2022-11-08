import { Injectable } from '@nestjs/common';
import { Customer } from './entities/customers.entity'
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull, LessThan, MoreThanOrEqual, In, Brackets, MoreThan, Not } from 'typeorm';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { Store } from '../stores/stores.entity';
import { CustomerListParam } from './interfaces/customer.interfaces';
import * as helpers from '../helpers/response'
import { plainToClass } from '@nestjs/class-transformer';
import { Order } from 'src/orders/entities/orders.entity';
import { Booking } from 'src/bookings/entities/bookings.entity';
import { Package } from 'src/package/package.entity';
import * as Constant from '../helpers/const'
import { OrderItem } from 'src/orders/entities/order-item.entity';
import async from "async"
import * as helper from '../helpers/response'
const axios = require('axios').default;
import * as bcrypt from 'bcrypt';
const otpGenerator = require('otp-generator')
import {
  paginate,
} from 'nestjs-typeorm-paginate';
@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,

    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,

    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,

    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
  ) { }

  async findAll(
    query: CustomerListParam,
    relations: string[] = [],
    throwsException = false,
  ) {

    const takeRecord = query.take || 30;
    const paginate = query.page || 1;
    const skip = (paginate - 1) * takeRecord;
    let date = new Date()
    let day = date.getDate()
    let month = date.getMonth() + 1

    try {
      var queryRes = this.customerRepo.createQueryBuilder('customer')
        .where('customer.soft_delete IS NULL')
        .andWhere('customer.type != 2')
        .orderBy('customer.id', 'DESC')
        .leftJoinAndSelect("customer.stores", "stores")


      if (query.keyword && typeof query.keyword) {
        queryRes = queryRes.andWhere(new Brackets(qb => {
          qb.where("customer.full_name like :full_name", { full_name: `%${query.keyword}%` })
            .orWhere("customer.email like :email", { email: `%${query.keyword}%` })
            .orWhere("customer.mobile like :mobile", { mobile: `%${query.keyword}%` })
        }))
      }

      if (query.day && typeof query.day != 'undefined') {
        queryRes = queryRes.andWhere("customer.day_birthday = :day", { day: query.day })
          .andWhere("customer.month_birthday = :month", { month: month })
      }
      if (query.month && typeof query.month != 'undefined') {
        queryRes = queryRes.andWhere("customer.month_birthday = :month", { month: month })
      }
      var total = await queryRes.getCount()
      var data = await queryRes.take(takeRecord).skip(skip).getMany()

      const totalDayBirthday = await this.customerRepo.count({ where: { day_birthday: day, month_birthday: month, year_birthday: IsNull(), soft_delete: IsNull(), type: Not(2) } })
      const totalMonthBirthday = await this.customerRepo.count({ where: { month_birthday: month, soft_delete: IsNull(), type: Not(2) } })
      const totalNewCustomer = await this.customerRepo.count({ where: { created_at: MoreThanOrEqual(new Date(date.setHours(0, 0, 0, 0))), soft_delete: IsNull(), type: Not(2) } })
      var datas = {
        'data': data,
        'total': total,
        'page_total': data.length,
        'total_day_birthday': totalDayBirthday,
        'total_month_birthday': totalMonthBirthday,
        'itemCountNew': totalNewCustomer
      }
      return helpers.success(datas)
    } catch (err) {
      console.log(err)
      return helpers.error(err, "customer.service.findAll")
    }

  }

  async findOne(
    id: number,
    relations: string[] = [],
    throwsException = false,
  ): Promise<Customer> {
    return await this.customerRepo.findOne({
      where: { id: id, soft_delete: IsNull(), type: Not(2) },
      relations,
    })
  }


  async create(customer: Customer, customerDto: CreateCustomerDto, userId: number) {

    try {
      let checkExitCustomer = await this.customerRepo.findOne({
        where: {
          soft_delete: IsNull(),
          mobile: customer.mobile
        }
      })

      if (checkExitCustomer) {
        return helpers.notFound('Khách hàng này đã tồn tại');
      }
      let arrUnit = customer.birthday.split("/");
      if (arrUnit.length > 2 && arrUnit[0] != "null" && arrUnit[1] != "null" && arrUnit[2] != "null") {
        customer.day_birthday = Number(arrUnit[0])
        customer.month_birthday = Number(arrUnit[1])
        customer.year_birthday = Number(arrUnit[2])
      } else {
        customer.birthday = ''
      }
      let customerData = this.customerRepo.create(customer)

      if (customerDto.stores) {
        const storeId = (customerDto.stores).map((item) =>
          this.storesRepository.create({ id: item })
        );
        customerData = this.customerRepo.create({
          ...customerData,
          stores: storeId
        });
      }

      customerData.created_by = userId
      customerData.updated_by = userId
      await axios({
        method: 'post',
        url: `${process.env.CARESOFT_URL}/contacts`,
        headers: {
          'Authorization': `Bearer ${process.env.CARESOFT_TOKEN}`
        },
        data: {
          "contact": {
            "email": customer.email,
            "phone_no": customerData.mobile,
            "username": customerData.full_name,
            "gender": customerData.gender - 1
          }
        }
      }).then(res => {
        const { data } = res
        customerData.contactId = data?.contact?.id.toString()
      })
      let customerRs = await this.customerRepo.save(customerData)
      return helpers.success(customerRs)
    } catch (error) {
      console.log(error)
      return helpers.error(error, "customer.service.create")
    }
  }

  async update(id: number, customerDto: CreateCustomerDto, userId: number) {
    try {
      customerDto.updated_at = new Date
      customerDto.updated_by = userId


      let checkExitCustomer = await this.customerRepo.findOne({
        where: {
          soft_delete: IsNull(),
          mobile: customerDto.mobile
        }
      })

      if (checkExitCustomer && checkExitCustomer.id != id) {
        return helpers.notFound('Số điện thoại này đã tồn tại');
      }

      let arrUnit = customerDto.birthday.split("/");
      if (arrUnit.length > 2 && arrUnit[0] != "null" && arrUnit[1] != "null" && arrUnit[2] != "null") {
        customerDto.day_birthday = Number(arrUnit[0])
        customerDto.month_birthday = Number(arrUnit[1])
        customerDto.year_birthday = Number(arrUnit[2])
      } else {
        customerDto.birthday = ''
      }
      let checkUserExists = await this.customerRepo.findOne({ where: { id: id, soft_delete: IsNull(), type: Not(2) }, relations: ["stores"] });
      let storeId = [];
      if (!checkUserExists) return helpers.notFound('Khách hàng này không tồn tại');
      if (customerDto.stores) {
        storeId = (customerDto.stores).map((item) =>
          this.storesRepository.create({ id: item })
        );
      }

      let dataUpdate = {
        ...checkUserExists,
        ...customerDto,
        stores: storeId
      };

      await axios({
        method: 'get',
        url: `${process.env.CARESOFT_URL}/contactsByPhone?phoneNo=${customerDto.mobile}`,
        headers: {
          'Authorization': `Bearer ${process.env.CARESOFT_TOKEN}`
        },
      }).then(async (rs) => {
        try {
          await axios({
            method: 'put',
            url: `${process.env.CARESOFT_URL}/contacts/${rs.data.contact.id}`,
            headers: {
              'Authorization': `Bearer ${process.env.CARESOFT_TOKEN}`
            },
            data: {
              "contact": {
                "email": customerDto.email,
                "phone_no": customerDto.mobile,
                "username": customerDto.full_name,
                "gender": customerDto.gender - 1
              }
            }
          })
          if (!checkExitCustomer.contactId) {
            dataUpdate.contactId = rs.data.contact.id.toString()
          }
        } catch (error) {
          return helpers.error(error, "customer.service.update")
        }

      }).catch(async (err) => {
        // console.log(err.response.data);
        // console.log(err.response.status);
        // console.log(err.response.headers);
        try {
          const res = await axios({
            method: 'post',
            url: `${process.env.CARESOFT_URL}/contacts`,
            headers: {
              'Authorization': `Bearer ${process.env.CARESOFT_TOKEN}`
            },
            data: {
              "contact": {
                "email": customerDto.email,
                "phone_no": customerDto.mobile,
                "username": customerDto.full_name,
                "gender": customerDto.gender - 1
              }
            }
          })
          const { data } = res
          console.log("data update", data)
          dataUpdate.contactId = data?.contact?.id.toString()
        } catch (error) {
          return helpers.error(error, "customer.service.update")
        }
      })

      let updateCustomer = await this.customerRepo.save(plainToClass(Customer, dataUpdate));

      return helpers.success(updateCustomer);
    } catch (err) {
      console.log("err")
      console.log(err)
      return helpers.error(err, "customer.service.update")
    }

  }

  async delete(id: number) {
    try {
      var res = await this.customerRepo.update(id, { soft_delete: new Date });
      return helpers.success(res);
    } catch (err) {
      console.log(err)
      return helpers.error(err, "customer.service.delete")
    }
  }

  async getDataOrderBuyId(id: number) {
    try {
      var now = new Date()
      var relationsBooking = ['stores']
      var relationOrder = ['orderItem', 'User', 'updatedBy', 'transaction']
      var orderIds = []
      var bookingItemBefore = await this.getDataBookingBefore(id, relationsBooking)
      var bookingItemAfter = await this.getDataBookingAfter(id, relationsBooking)
      var getDataOrderMade = await this.getDataOrderMade(id, relationOrder)
      const getCountOrderStatus = await this.countOrderStatus(id)
      var getDataPacked = await this.getDataPackage(id)

      var totalMadeOrder = 0;
      var totalPrices = 0
      if (getDataOrderMade.length > 0) {
        getDataOrderMade.map((item) => {
          orderIds.push(item.id)
          if (item.total_price > 0) {
            totalMadeOrder++
          }
          totalPrices += (item.total_price - item.money_owed - item.deposit_total)
        })
      }
      var dataOrderItemCard = await this.getOrderItemCard(id, orderIds)
      var data = {
        dataUpcomingBooking: {
          Data: bookingItemBefore,
          Total: bookingItemBefore.length
        },
        dataBookingUnfulfilled: {
          Data: bookingItemAfter,
          Total: bookingItemAfter.length
        },
        dataMadeOrder: { Total: getDataOrderMade.length, Data: getDataOrderMade, TotalPay: totalMadeOrder, TotalPrices: totalPrices },
        dataPackage: { Total: getDataPacked.length, Data: getDataPacked },
        dataOrderItemCard: { Total: dataOrderItemCard.length, Data: dataOrderItemCard },
        getCountOrderStatus

      }
      return helpers.success(data)
    } catch (error) {
      console.log(error)
      return helpers.error(error, "customer.service.getDataOrderBuyId")
    }
  }

  async getDataBookingBefore(id: number, relations: string[] = []) {
    var now = new Date()
    var bookingItemBefore = await this.bookingRepository.find({
      where: {
        soft_delete: IsNull(),
        customers: {
          id: id
        },
        book_date: MoreThanOrEqual(now)
      },
      order: {
        book_date: "DESC",
      },
      relations
    })
    return bookingItemBefore
  }
  async countOrderStatus(id: number) {
    return await async.parallel({
      countOrderStatus: (cb) => {
        this.bookingRepository.count({
          relations: {
            customers: true,
          },
          where: {
            soft_delete: IsNull(),
            customers: {
              id: id
            },
            status: 2
          },
          order: {
            book_date: "DESC",
          },
        }).then(rs => cb(null, rs))
      },
      countCancelStatus: (cb) => {
        this.bookingRepository.count({
          relations: {
            customers: true,
          },
          where: {
            soft_delete: IsNull(),
            customers: {
              id: id
            },
            book_status: In([5, 6]),
          },
          order: {
            book_date: "DESC",
          },
        }).then(rs => cb(null, rs))
      },
      countMeetingStatus: (cb) => {
        this.bookingRepository.count({
          relations: {
            customers: true,
          },
          where: {
            soft_delete: IsNull(),
            customers: {
              id: id
            },
            status: 3
          },
          order: {
            book_date: "DESC",
          },
        }).then(rs => cb(null, rs))
      }
    }).then(rs => {
      return rs
    })
  }

  async getDataBookingAfter(id: number, relations: string[] = []) {
    var now = new Date()
    var bookingItemAfter = await this.bookingRepository.find({
      where: {
        soft_delete: IsNull(),
        customers: {
          id: id
        },
        book_status: In([1, 2, 3]),
        book_date: LessThan(now)
      },
      order: {
        book_date: "DESC",
      },
      relations
    })
    return bookingItemAfter
  }

  async getDataOrderMade(id: number, relations: string[] = []) {
    var data = this.orderRepository.find({
      where: {
        // total_price: MoreThan(0),
        soft_delete: IsNull(),
        customers: {
          id: id
        },
        status: Constant.statusOrder.success
      },
      relations,
      select: {
        User: {
          id: true,
          name: true
        },
        updatedBy: {
          id: true,
          name: true
        }
      },
      order: {
        order_at: "DESC",
      },
    })
    return data;
  }

  async getDataPackage(id: number) {
    var data = this.packageRepository.find({
      where: {
        soft_delete: IsNull(),
        customer: {
          id: id
        }
      },
      relations: {
        product: true,
        store: true
      },
      order: {
        created_at: "DESC",
      },
    })
    return data
  }

  async getOrderItemCard(id: number, orderId: any[]) {
    let data = [];
    if (orderId.length > 0) {
      data = await this.orderItemRepository.createQueryBuilder("order_item")
        .where("order_item.order_id IN (:...order_id)", { order_id: orderId })
        .andWhere("order_item.product_id IS NOT NULL")
        .addSelect("SUM(order_item.quantity)", "sum_quantity")
        .andWhere("order.status = 3")
        .leftJoinAndSelect("order_item.order", "order")
        .leftJoinAndSelect("order_item.product", "product")
        .groupBy("order_item.product_id")
        .getRawMany();
    }
    return data
  }

  async getDataOrderItem(id: number) {
    try {
      var orderItem = await this.orderItemRepository.find({
        where: { order: { id: id } },
        relations: {
          product: true
        }
      })
      return helpers.success(orderItem)
    } catch (err) {
      console.log(err)
      return helpers.error(err, "customer.service.getDataOrderItem")
    }
  }

  async getFeaturesItem(id: number) {
    try {
      var orderIds = []
      var relationOrder = ['orderItem', 'User', 'updatedBy', 'transaction']
      var getDataOrderMade = await this.getDataOrderMade(id, relationOrder)
      if (getDataOrderMade.length > 0) {
        getDataOrderMade.map((item) => {
          orderIds.push(item.id)
        })
      }
      var dataOrderItemCard = await this.getOrderItemCard(id, orderIds)

      return helpers.success(dataOrderItemCard)
    } catch (err) {
      console.log(err)
      return helpers.error(err, "customer.service.getDataOrderItem")
    }
  }

  async checkPhoneCustomer(mobile: string) {

    const customer = await this.customerRepo.findOne({
      where: {
        mobile: mobile
      }
    })

    if (!customer) return true

    if (customer.mobile === "") {
      return true
    } else {
      if (customer.mobile === mobile) {
        return false
      }
      return true
    }
  }
  async checkPhone(phone: string) {
    try {
      const customer = await this.customerRepo.findOne({
        where: {
          mobile: phone
        }
      })
      const otp = await this.generateOtp()
      // const sendSMS = await axios.get(`https://restapi.esms.vn/MainService.svc/json/GetSendStatus?RefId=b237e302-6bad-4b8b-beb8-2ab8d3cfd48b46&ApiKey=${process.env.API_KEY_SMS}&SecretKey=${process.env.SECRET_KEY_SMS}`)
      // if(sendSMS.data.CodeResponse == "100"){
      if (customer) {
        customer.otp = otp
        const updateCus = await this.customerRepo.save({ ...customer })
        return helper.success(updateCus)
      } else {
        const customer = new Customer()
        customer.otp = otp
        customer.mobile = phone
        const newCustomer = this.customerRepo.create(customer)
        let newData = await this.customerRepo.save(newCustomer)
        return helper.success(newData)
      }
      // }

    } catch (error) {
      return helper.error(error)
    }
  }
  async recoverPassword(phone: string) {
    try {
      const customer = await this.customerRepo.findOne({
        where: {
          mobile: phone
        }
      })
      if (!customer) return helper.notFound("Không thấy khách hàng đó")
      const otp = await this.generateOtp()
      // const sendSMS = await axios.get(`https://restapi.esms.vn/MainService.svc/json/GetSendStatus?RefId=b237e302-6bad-4b8b-beb8-2ab8d3cfd48b46&ApiKey=${process.env.API_KEY_SMS}&SecretKey=${process.env.SECRET_KEY_SMS}`)
      // if(sendSMS.data.CodeResponse == "100"){
      customer.otp = otp
      await this.customerRepo.save({ ...customer })
      return helper.success({ data: null })
      // }

    } catch (error) {
      return helper.error(error)
    }
  }
  async saveRecoverPassword(phone: string, password: string) {
    try {
      const customer = await this.customerRepo.findOne({
        where: {
          mobile: phone,
          isRecoverPassword: 1
        }
      })
      if (!customer) return helper.notFound("Không thấy khách hàng đó")
      customer.password = await this.hashPassword(password)
      const update = await this.customerRepo.save({ ...customer })
      if (update) {
        customer.isRecoverPassword = 0
        await this.customerRepo.save({ ...customer })
        return helper.success({ data: update })
      }

    } catch (error) {
      return helper.error(error)
    }
  }
  async saveRecoverPassword2(phone: string, password: string) {
    try {
      const customer = await this.customerRepo.findOne({
        where: {
          mobile: phone,
        }
      })
      if (!customer) return helper.notFound("Không thấy khách hàng đó")
      customer.password = await this.hashPassword(password)
      await this.customerRepo.save({ ...customer })

      return helper.success({ data: null })


    } catch (error) {
      return helper.error(error)
    }
  }
  async savePassword(phone: string, password: string) {
    try {
      const customer = await this.customerRepo.findOne({
        where: {
          mobile: phone
        }
      })
      if (!customer) return helper.notFound("Khách hàng không hợp lệ")

      if (customer.password) return helper.notFound("Khách hàng đã được tạo mật khẩu")

      customer.password = await this.hashPassword(password)

      const updateCus = await this.customerRepo.save({ ...customer })

      return helper.success(updateCus)

    } catch (error) {
      return helper.error(error)
    }
  }
  async login(phone: string, otp: string) {
    try {
      const customer = await this.customerRepo.findOne({
        where: {
          mobile: phone
        }
      })
      if (!customer) return helper.notFound("Khách hàng không hợp lệ")

      const isValid = await bcrypt.compare(otp, customer.password)
      if (!isValid) return false
      return customer

    } catch (error) {
      return helper.error(error)
    }
  }
  async generateOtp() {
    const activationCode = otpGenerator.generate(6, {
      alphabets: false,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false,
      digits: true
    });
    return "111111"
  }
  async checkOtp(phone: string, otp: string) {
    try {
      const customer = await this.customerRepo.findOne({
        where: {
          mobile: phone,
          otp: otp
        }
      })
      if (!customer) return helper.error("Mã Otp không hợp lệ")

      customer.isRecoverPassword = 1

      const updateCus = await this.customerRepo.save({ ...customer })

      return helper.success(updateCus)
    } catch (error) {
      return helper.error(error)
    }
  }
  async getInfor(req) {
    try {
      const customer = await this.customerRepo.findOneBy({ id: req.user.id })
      return helper.success(customer)
    } catch (error) {
      console.log(error)
      return helper.error(error)
    }
  }
  async updateInfor(body: any, req) {
    try {
      const {
        email,
        full_name,
        address,
        city,
        district
      } = body
      const update = await this.customerRepo.update(req.user.id, { email, full_name, address, city, district })
      return helper.success(update)
    } catch (error) {
      console.log(error)
      return helper.error(error)
    }
  }
  async getOrderByCustomer(query, req) {
    try {
      const { limit, page } = query
      const options = {
        limit: parseInt(limit) || 10,
        page: parseInt(page) || 1
      }
      const res = await paginate(this.orderRepository, options, {
        where: {
          customers: {
            id: req.user.id
          }
        },
        relations: {
          customers: true
        }
      });

      return helper.success(res)
    } catch (error) {
      console.log(error)
      return helper.error(error)
    }
  }
  async getPackagesByCustomer(query, req) {
    try {
      const { limit, page } = query
      const options = {
        limit: parseInt(limit) || 10,
        page: parseInt(page) || 1
      }
      const res = await paginate(this.packageRepository, options, {
        where: {
          customer_id: req.user.id
        },
        order: {
          created_at: "DESC"
        }
      });

      return helper.success(res)
    } catch (error) {
      console.log(error)
      return helper.error(error)
    }

  }
  async getPackagesCustomer(req) {
    try {
      const data = await this.packageRepository.find({
        where: {
          soft_delete: IsNull(),
          customer: {
            id: req.user.id
          },
          status: 1
        },
        relations: {
          product: true,
        },
        order: {
          created_at: "DESC",
        },
      })
      return helper.success(data)
    } catch (error) {
      console.log(error)
      return helper.error(error)
    }
  }
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    let passwordHash = await bcrypt.hash(password, salt);
    return passwordHash;
  }
  async checkPhoneInCrm(mobile: string) {
    try {
      const data = await this.customerRepo.findOne({
        where: {
          mobile: mobile
        }
      })
      if (!data) {
        const fetchCus = await axios.get(`${process.env.CARESOFT_URL}/contacts?phone=${mobile}`, {
          headers: {
            'Authorization': `Bearer ${process.env.CARESOFT_TOKEN}`
          }
        })
        return helper.success({ data: fetchCus.data, new: true })
      }
      return helper.success({ data, new: false })
    } catch (error) {
      console.log(error)
      return helper.error(error)
    }
  }
}
