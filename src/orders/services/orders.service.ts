import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, Brackets, In } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { startOfDay, endOfDay, add, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { plainToClass } from '@nestjs/class-transformer';

import { Order } from '../entities/orders.entity'
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';

import * as helper from '../../helpers/response';
import { Store } from '../../stores/stores.entity'
import { Product } from '../../products/entities/product.entity'
import { Customer } from '../../customers/entities/customers.entity';
import { OrderItem } from '../entities/order-item.entity'
import { addLeadingZeros } from '../../helpers/const';
import { Package } from '../../package/package.entity'
import { Transaction } from '../../transaction/transaction.entity'
import { Booking } from '../../bookings/entities/bookings.entity'
import { Credit } from '../../credit/entities/credit.entity'
const axios = require('axios').default;
import async from "async"
let _ = require('lodash');

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,

    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,

    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,

    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Package)
    private readonly packagesRepo: Repository<Package>,

    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,

    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,

    @InjectRepository(Credit)
    private readonly creditRepo: Repository<Credit>,
  ) { }

  async getAllOrders(id_store: number) {
    try {
      let dataOder = await this.orderRepo.findAndCount({
        where: {
          stores: { id: id_store },
          soft_delete: IsNull(),
          status: 1
        },
        order: { updated_at: 'DESC' },
        relations: ["stores", "customers", 'orderItem', 'orderItem.package']
      });

      return helper.success({ 'orderList': dataOder[0], 'total': dataOder[1] });
    } catch (error) {
      return helper.error(error, "order.service.getAllOrders")
    }
  }

  async getOrderByCode(query: any) {
    try {
      let dataOder = await this.orderRepo.findOne({
        where: {
          order_code: query.order_code,
          stores: { id: query.store_id },
          soft_delete: IsNull(),
          status: 1
        },

        relations: ["customers", 'orderItem']
      });

      return helper.success(dataOder);
    } catch (error) {
      return helper.error(error, "order.service.getOrderByCode")
    }
  }

  async updateCustomer(order: UpdateOrderDto, type: boolean, order_code: string) {
    try {
      let customer = await this.customerRepo.findOne({ where: { id: order.customers.id, soft_delete: IsNull() } });
      if (!customer) return helper.notFound('Khách hàng này không tồn tại');
      let customerCreditHistory = new Credit();

      customerCreditHistory.customer_id = customer.id
      customerCreditHistory.old_price = Number(customer.deposit_money)
      customerCreditHistory.store_id = Number(order.stores)
      customerCreditHistory.store_name = order.store_name
      customerCreditHistory.created_by = order.updated_by
      customerCreditHistory.created_by_name = order.updated_by_name
      customerCreditHistory.order_code = order_code

      if (type === true) {
        customer.deposit_money = customer.deposit_money + order.total_price

        customerCreditHistory.reason = "Thẻ cọc"
        customerCreditHistory.note = order.orderItem[0].note ?? ""
        customerCreditHistory.change_price = Number(order.total_price)
      } else {
        let paid_amount = 0;
        order.transaction.map((val, key) => {
          if (val.pay_type == "Sử dụng cọc") {
            paid_amount += val.paid_amount
          }
        })

        customer.deposit_money = customer.deposit_money - paid_amount

        customerCreditHistory.change_price = Number(paid_amount)
        customerCreditHistory.reason = "Thanh toán order"
      }

      customerCreditHistory.new_price = Number(customer.deposit_money)

      //save credit_history
      let dataCustomerCreditHistory;
      if (customerCreditHistory.change_price > 0) dataCustomerCreditHistory = await this.creditRepo.save(customerCreditHistory);

      //Update money owe customer
      if (order.money_owed > 0) customer.owe_money += order.money_owed

      //save deposit_money in customer
      await this.customerRepo.update(order.customers.id, customer);

      return { dataCustomerCreditHistory, customer };
    } catch (error) {
      console.log(error)
      return helper.error(error, "order.service.updateCustomer")
    }
  }

  async createOrder(createOrderDto: CreateOrderDto, user) {
    try {
      createOrderDto.total_price = 0;
      createOrderDto.money_owed = 0;
      createOrderDto.money_paid = createOrderDto.money_paid ?? 0;
      createOrderDto.created_by = user.id
      createOrderDto.created_name = user.name


      //Create repo store and customer
      let dataStore: any;
      if (createOrderDto.stores) dataStore = this.storeRepo.create({ id: createOrderDto.stores })

      let dataCustomer = await this.handleCreateOrUpdateCustomer(createOrderDto, true)
      
      // if (!dataCustomer) {
      //   return  helper.notFound('Khách hàng này đã tồn tại');
      // }


      //Create Order Item
      if (createOrderDto.orderItem && createOrderDto.orderItem.length > 0) {
        let productData = await this.getDataProduct(createOrderDto.orderItem)
        for (let i = 0; i < createOrderDto.orderItem.length; i++) {
          let orderItem = createOrderDto.orderItem[i]
          createOrderDto.total_price += Number(orderItem.quantity) * Number(orderItem.price) - Number(orderItem.discount)

          if (!createOrderDto.isDeposit) {
            orderItem.price = orderItem.price ?? productData[orderItem.product_id].price
            orderItem.product_name = orderItem.product_name ?? productData[orderItem.product_id].product_name
            orderItem.product_code = productData[orderItem.product_id] && productData[orderItem.product_id].code ? productData[orderItem.product_id].code : ''
            if (orderItem.new_package) {
              orderItem.max_used_package = productData[orderItem.product_id]['max_used'] ?? 0
              orderItem.last_used_count = productData[orderItem.product_id]['max_used'] ?? 0
            }
          }
          createOrderDto.orderItem[i] = orderItem
        }
      }

      //Create order
      let createOrder = await this.handleCreateOrder(createOrderDto, dataStore, dataCustomer)

      //Save status booking
      let updateBooking: any;
      if (createOrderDto.id_booking && createOrder) updateBooking = await this.bookingRepo.update(createOrderDto.id_booking, { book_status: 7, order_status: 2 });

      return helper.success({ createOrder });

    } catch (error) {
      console.log(error)
      return helper.error(error, "order.service.createOrder")
    }
  }

  async updateOrder(id: number, updateOrderDto: UpdateOrderDto, user) {
    try {
      let checkOrderExists = await this.orderRepo.findOne({ where: { id: id }, relations: ["stores", "customers"] });
      if (!checkOrderExists) return helper.notFound('Hóa đơn này không tồn tại');

      if (updateOrderDto.status === 2) {
        return helper.success(await this.cancelOrder(id, updateOrderDto))
      }
      //Remove all order item by id order
     
      let oldPackage = { status: true, data: [] };
      updateOrderDto.total_price = 0;
      updateOrderDto.money_owed = 0;
      updateOrderDto.updated_by = user.id
      updateOrderDto.updated_by_name = user.name

      if (updateOrderDto.orderItem.length > 0) {
        let productData = await this.getDataProduct(updateOrderDto.orderItem)
        let packageData = await this.getDataPackageDetailOrder(updateOrderDto.orderItem)

        for (let i = 0; i < updateOrderDto.orderItem.length; i++) {
          let orderItem = updateOrderDto.orderItem[i]
          updateOrderDto.total_price += Number(orderItem.quantity) * Number(orderItem.price) - Number(orderItem.discount)

          for (let x = 1; x <= 5; x++) {
            updateOrderDto.orderItem[i]["employee_service" + x] = updateOrderDto.orderItem[i]["employee_service" + x] ?? null
            updateOrderDto.orderItem[i]["employee_service_name" + x] = updateOrderDto.orderItem[i]["employee_service_name" + x] ?? null
            updateOrderDto.orderItem[i]["employee_consultant" + x] = updateOrderDto.orderItem[i]["employee_consultant" + x] ?? null
            updateOrderDto.orderItem[i]["employee_consultant_name" + x] = updateOrderDto.orderItem[i]["employee_consultant_name" + x] ?? null
          }

          if (!updateOrderDto.isDeposit) {
            orderItem.price = orderItem.price ?? productData[orderItem.product_id].price
            orderItem.product_name = orderItem.product_name ?? productData[orderItem.product_id].product_name
            orderItem.product_code = productData[orderItem.product_id] && productData[orderItem.product_id].code ? productData[orderItem.product_id].code : ''

            if (orderItem.new_package) {
              orderItem.max_used_package = orderItem.max_used ?? productData[orderItem.product_id]['max_used']
              orderItem.last_used_count = orderItem.max_used ?? productData[orderItem.product_id]['max_used']
            } else {
              if (orderItem.package_code) {
                if (packageData[orderItem.package_code]) {
                  // orderItem.price = 0

                  orderItem.package = packageData[orderItem.package_code];
                  if (orderItem.max_used) {
                    orderItem.max_used_package = orderItem.max_used
                    orderItem.last_used_count = orderItem.max_used
                  } else {
                    let max_used = Number(packageData[orderItem.package_code].max_used),
                      count_used = Number(packageData[orderItem.package_code].count_used),
                      left_used = max_used - count_used;

                    if (left_used >= orderItem.quantity) {
                      orderItem.max_used_package = max_used
                      orderItem.last_used_count = (left_used - orderItem.quantity) ?? 0
                    } else {
                      oldPackage.status = false
                    }
                  }
                }
              }
            }
          }
          updateOrderDto.orderItem[i] = orderItem
        }
      }


      updateOrderDto.money_owed = updateOrderDto.total_price - updateOrderDto.money_paid;

      if (oldPackage.status === false) return helper.notFound('Thẻ dịch vụ không đủ điều kiện sử dụng')

      let dataStore: any;
      if (updateOrderDto.stores) dataStore = this.storeRepo.create({ id: updateOrderDto.stores })

       // Create or Edit customer
      let dataCustomer = await this.handleCreateOrUpdateCustomer(updateOrderDto, false)
      // if (!dataCustomer) {
      //   return  helper.notFound('Khách hàng này đã tồn tại');
      // }

      checkOrderExists.deposit_total = 0;

      let orderDataUpdate = this.orderRepo.create({
        ...checkOrderExists,
        ...updateOrderDto,
        stores: dataStore,
        customers: dataCustomer
      });

      // update order
      let orderData = await this.orderRepo.save(plainToClass(Order, orderDataUpdate));

      return helper.success(orderData.orderItem);
    } catch (error) {
      console.log(error)
      return helper.error(error, "order.service.updateOrder")
    }
  }

  async saveOrder(id: number, updateOrderDto: UpdateOrderDto, userId) {
    
    try {
      let checkOrderExists = await this.orderRepo.findOne({ where: { id: id }, relations: ["stores", "customers"] });
      if (!checkOrderExists) return helper.notFound('Hóa đơn này không tồn tại');

      //Remove all order item by id order
      let newPackage = [];
      let oldPackage = { status: true, data: [] };
      updateOrderDto.total_price = 0;
      updateOrderDto.money_owed = 0;

      if (updateOrderDto.orderItem.length > 0) {
        let productData = await this.getDataProduct(updateOrderDto.orderItem)
        let packageData = await this.getDataPackageDetailOrder(updateOrderDto.orderItem)

        for (let i = 0; i < updateOrderDto.orderItem.length; i++) {
          let orderItem = updateOrderDto.orderItem[i]
          updateOrderDto.total_price += Number(orderItem.quantity) * Number(orderItem.price) - Number(orderItem.discount)

          for (let x = 1; x <= 5; x++) {
            updateOrderDto.orderItem[i]["employee_service" + x] = updateOrderDto.orderItem[i]["employee_service" + x] ?? null
            updateOrderDto.orderItem[i]["employee_service_name" + x] = updateOrderDto.orderItem[i]["employee_service_name" + x] ?? null
            updateOrderDto.orderItem[i]["employee_consultant" + x] = updateOrderDto.orderItem[i]["employee_consultant" + x] ?? null
            updateOrderDto.orderItem[i]["employee_consultant_name" + x] = updateOrderDto.orderItem[i]["employee_consultant_name" + x] ?? null
          }

          if (!updateOrderDto.isDeposit) {

            orderItem.price = orderItem.price ?? productData[orderItem.product_id].price
            orderItem.product_name = orderItem.product_name ?? productData[orderItem.product_id].product_name
            orderItem.product_code = productData[orderItem.product_id] && productData[orderItem.product_id].code ? productData[orderItem.product_id].code : ''

            if (orderItem.new_package && !orderItem.package) {
              let dataNewPackage = await this.handleAddNewPackage(updateOrderDto, orderItem, productData[orderItem.product_id], checkOrderExists)

              for (let a = 0; a < Number(orderItem.quantity); a++) {
                newPackage.push(this.packagesRepo.create(dataNewPackage))
              }

              orderItem.max_used_package = orderItem.max_used ?? productData[orderItem.product_id]['max_used'] ?? 0
              orderItem.last_used_count = orderItem.max_used ?? dataNewPackage.max_used
            } else {
              if (orderItem.package_code) {
                if (packageData[orderItem.package_code]) {
                  // orderItem.price = 0
                  // if (orderItem.price)

                  orderItem.package = packageData[orderItem.package_code];
                  let max_used = Number(packageData[orderItem.package_code].max_used),
                    count_used = Number(packageData[orderItem.package_code].count_used),
                    left_used = max_used - count_used;

                  if (orderItem.max_used) {
                    orderItem.max_used_package = orderItem.max_used
                    orderItem.last_used_count = orderItem.max_used
                  } else {
                    orderItem.max_used_package = max_used ?? 0
                    orderItem.last_used_count = (left_used - orderItem.quantity) ?? 0
                  }

                  if (left_used >= orderItem.quantity) {
                    let dataOldPackage = await this.handleUpdatePackageOld(updateOrderDto, orderItem, packageData[orderItem.package_code])
                    orderItem.package = dataOldPackage ?? null
                    oldPackage.data.push(this.packagesRepo.create(dataOldPackage))
                  } else {
                    oldPackage.status = false
                  }
                }
              }
            }
          }
          updateOrderDto.orderItem[i] = orderItem
        }
      }

      if (oldPackage.status === false) return helper.notFound('Thẻ dịch vụ không đủ điều kiện sử dụng');

      updateOrderDto.money_owed = updateOrderDto.total_price - updateOrderDto.money_paid;

      let dataStore: any;
      if (updateOrderDto.stores) dataStore = this.storeRepo.create({ id: updateOrderDto.stores })

      let customerId = this.customerRepo.create({id: updateOrderDto.customers.id})

       //Insert new package
       updateOrderDto = await this.handleCreateAndUpdatePackage(updateOrderDto, newPackage, oldPackage);
       var orderDataUpdate = {
          status : updateOrderDto.status,
          description: updateOrderDto.description,
          total_price: updateOrderDto.total_price,
          money_owed: updateOrderDto.money_owed,
          payment_type: updateOrderDto.payment_type,
          order_at: updateOrderDto.order_at,
          updated_by: updateOrderDto.updated_by,
          isDeposit: updateOrderDto.isDeposit,
          deposit_total: checkOrderExists.deposit_total
       }
      
      var newOrderItem =  updateOrderDto.orderItem

      //save transaction
      var dataTransactions = []
      let dataUpdate;
      if (updateOrderDto.transaction && updateOrderDto.transaction.length > 0) {
        
        var transactions = await this.handleDataTransactionByOrder(updateOrderDto, checkOrderExists, userId)
        dataTransactions = transactions.data
        orderDataUpdate.deposit_total = transactions.deposits
        dataUpdate = await async.parallel({
          addOrderItem: (cb) => {
            // this.orderItemRepo.delete({order:{id: checkOrderExists.id}})
            this.orderItemRepo.save(newOrderItem).then(rs => cb(null, rs))
          },
          updateOrder: (cb) => {
            this.orderRepo.update(checkOrderExists.id, orderDataUpdate).then(rs => cb(null, rs))
          },
          updateCus: (cb) => {
            this.updateCustomer(updateOrderDto, updateOrderDto.isDeposit, checkOrderExists.order_code).then(rs => cb(null, rs))
          }
        }).catch(err => {
          console.log(err);
          return helper.error(err, "order.service")
        })
      }

      //Save transaction
      let resTransaction = await this.transactionRepo.save(dataTransactions);
      resTransaction.map((val, key) => {
        let transactionCode = "GD" + addLeadingZeros(val.id, 6)
        this.transactionRepo.update(val.id, { transaction_code: transactionCode })
      })

      return helper.success(dataUpdate);
    } catch (error) {
      console.log(error)
      return helper.error(error, "order.service.saveOrder")
    }
  }

  async cancelOrder(id: number, updateOrderDto) {
    if (updateOrderDto.id_booking) await this.bookingRepo.update(updateOrderDto.id_booking, { order_status: 1 });
    let orderData = await this.orderRepo.save(plainToClass(Order, { id: id, status: updateOrderDto.status }));
    return orderData;
  }

  async handleOrderItem(orderItem, productData) {
    if (!productData) {
      orderItem.product_id = null
      return orderItem
    }

    if (productData.type === 2) {
      productData.meta.map((item) => {
        productData[item.meta_key] = item.meta_value
      })
    }
    orderItem.price = orderItem.price ?? productData.price
    orderItem.product_name = orderItem.product_name ?? productData.product_name
    orderItem.product_code = productData && productData.code ? productData.code : ''
    return orderItem
  }

  async handleAddNewPackage(orderDto, orderItem, productData, order) {
    let maxUsedPackage = 0;
    maxUsedPackage = (orderItem.max_used || orderItem.max_used != '' || orderItem.max_used != null) ? orderItem.max_used : productData['max_used']
    let dataNewPackage = {
      type: (productData['card_type'] == 1) ? "Thẻ lần" : (productData['card_type'] == 2) ? "Thẻ tiền" : "",
      expiration_date: add(new Date(orderDto.order_at), { months: productData['use_time_month'] }),
      count_used: 0,
      status: 1,
      customer_mobile: orderDto.customers.mobile,
      max_used: maxUsedPackage ?? 0,
      date_of_issue: new Date(),
      product_name: productData.product_name,
      customer_name: orderDto.customers.full_name,
      order_code: order.order_code,
      customer_id: orderDto.customers.id,
      product_id: productData.id,
      order_id: order.id,
      store_id: order.stores.id,
      price_of_card: orderItem.price ?? 0,
      initial_amount: (orderItem.price * orderItem.quantity - orderItem.discount) ?? 0,
      last_used: '',
      created_by: orderDto.updated_by,
      updated_by: orderDto.updated_by,
      sale_card: (orderItem.price * orderItem.quantity - orderItem.discount) ?? 0,
      note: orderItem.note
    };
    return dataNewPackage
  }

  async handleUpdatePackageOld(orderDto, orderItem, packageExit) {
    let max_used = Number(packageExit.max_used),
      count_used = Number(packageExit.count_used);

    if (orderItem.price === 0 && orderItem.package_code) {
      count_used = count_used + orderItem.quantity
    }
    packageExit.count_used = count_used,
      packageExit.max_used = orderItem.max_used ?? max_used,
      packageExit.last_used = new Date(),
      packageExit.updated_by = orderDto.updated_by
    packageExit.customer_id = orderDto.customers.id
    packageExit.customer_mobile = orderDto.customers.mobile
    packageExit.customer_name = orderDto.customers.full_name

    packageExit.status = (count_used === max_used) ? 4 : 1

    return packageExit
  }


  async handleCreateOrUpdateCustomer(orderDto, isBooking) {
      orderDto.customers.type = 1

    if (orderDto.customers.full_name == 'Khách lẻ' && !orderDto.customers.mobile) {
      orderDto.customers.type = 2
    }

      if (orderDto.id_booking && typeof orderDto.id_booking != 'undefined' && isBooking) {
          return orderDto.customers
      }
      let dataCustomer = await this.customerRepo.save(plainToClass(Customer, orderDto.customers));
      return dataCustomer
  }

  async handleCreateOrder(orderDto, dataStore, dataCustomer) {
    orderDto.money_owed = orderDto.total_price - orderDto.money_paid;
    let orderData = {}
    orderData = this.orderRepo.create({
      ...orderDto,
      stores: dataStore,
      customers: dataCustomer
    });

    let createOrder = await this.orderRepo.save(orderData);

    //Create order_code using order_id
    let order_code = "HD" + addLeadingZeros(createOrder.id, 6);
    await this.orderRepo.update(createOrder.id, { order_code: order_code, money_owed: orderDto.money_owed });
    createOrder.order_code = order_code
    return createOrder
  }

  async getDataPackageDetailOrder(orderItem) {
    let listPackageCode = await _.map(orderItem, 'package_code');

    let checkPackageExists = await this.packagesRepo.find({
      where: { soft_delete: IsNull(), package_code: In(listPackageCode) }
    })

    checkPackageExists = await _.mapKeys(checkPackageExists, function (value) { return value.package_code; });

    return checkPackageExists
  }

  async checkPackageOrderItem(order) {
    let status = true
    if (!order.orderItem) true
    for (let i = 0; i < order.orderItem.length; i++) {
      if (!order.isDeposit) {
        if (order.orderItem[i].new_package === false && order.orderItem[i].package_code) {
          let checkPackageExists = await this.packagesRepo.findOne({
            where: {
              package_code: order.orderItem[i].package_code,
              // product_id: createOrderDto.orderItem[i].product_id,
              customer_id: order.customers.id,
              status: 1,
              soft_delete: IsNull()
            }
          })

          if (checkPackageExists) {
            order.total_price = order.total_price - (Number(order.orderItem[i].quantity) * Number(order.orderItem[i].price))
            order.orderItem[i].price = 0
            let max_used = Number(checkPackageExists.max_used),
              count_used = Number(checkPackageExists.count_used);
            let left_used = max_used - count_used;
            if (left_used < order.orderItem[i].quantity) {
              status = false
            }

          } else {
            status = false
          }
        }
      }
    }
    return status
  }

  async getDataProduct(orderItem) {
    let listProductId = await _.map(orderItem, 'product_id');
    let productData = await this.productRepo.find({
      where: { id: In(listProductId) },
      relations: ['meta']
    });

    _.forEach(productData, function (value) {
      if (value.type === 2) _.forEach(value.meta, function (item) { value[item.meta_key] = item.meta_value })
    });

    productData = await _.mapKeys(productData, function (value) { return value.id; });

    return productData
  }

  async handleCreateAndUpdatePackage(orderDto, newPackage, oldPackage) {
    let listNewPackage = await this.packagesRepo.save(newPackage);
    let listOldPackage = await this.packagesRepo.save(oldPackage.data);

    //save package_code
    let listPackageCode = [];
    let listPackageId = [];
    for (let i = 0; i < listNewPackage.length; i++) {
      let package_code = "TDV" + addLeadingZeros(listNewPackage[i].id, 6)
      listNewPackage[i].package_code = package_code;
      listPackageCode[listNewPackage[i].product_id] = package_code;
      listPackageId[listNewPackage[i].product_id] = listNewPackage[i]
    }
    listNewPackage = await this.packagesRepo.save(newPackage);

    for (let i = 0; i < orderDto.orderItem.length; i++) {
      let orderItem = orderDto.orderItem[i]
      if (typeof orderItem.package != "undefined" && orderItem.package) {
        orderItem.package_code = orderItem.package.package_code
      }
      if (orderItem.package_code === '' || !orderItem.package_code) {
        orderItem.package_code = listPackageCode[orderItem.product_id]
        orderItem.package = listPackageId[orderItem.product_id]
      }
      orderDto.orderItem[i] = orderItem
    }

    return orderDto
  }


  async handleDataTransactionByOrder(updateOrderDto, orderData, userId) {
    var dataTransactions = []
    var remainAmount = updateOrderDto.total_price
    let totalAmountPaid = 0
    let totalDeposit = 0
    if (updateOrderDto.transaction.length == 1) {
      updateOrderDto.transaction[0].pay_type = updateOrderDto.payment_type
    }
    for (var val of updateOrderDto.transaction) {
      if (val.pay_type === "Sử dụng cọc") {
        totalDeposit += val.paid_amount
      }
      remainAmount -= val.paid_amount
      totalAmountPaid += val.paid_amount
      let dataTransaction = {
        paid_amount: val.paid_amount,
        total_amount: val.total_amount,
        remain_amount: remainAmount,
        pay_type: val.pay_type,
        store_id: Number(val.store_id),
        created_by: userId,
        pay_account_number: val.pay_account_number,
        order: {id: orderData.id},
      }
      dataTransactions.push(dataTransaction)
    }


    return { data: dataTransactions, deposits: totalDeposit, amountPaids: totalAmountPaid }
  }


  async removeOrderItem(id_order: number) {
    try {
      await this.orderItemRepo.createQueryBuilder('order_item')
        .delete()
        .where("order_id = :id", { id: id_order })
        .execute()
    } catch (error) {
      return helper.error(error, "order.service")
    }
  }

  async removeTransaction(id_order: number) {
    try {
      await this.transactionRepo.delete({ order: { id: id_order }, status: 1 });
    } catch (error) {
      return helper.error(error, "order.service.removeTransaction")
    }
  }

  async removePackage(id_order: number) {
    try {
      await this.packagesRepo.delete({ order_id: id_order });
    } catch (error) {
      return helper.error(error, "order.service.removePackage")
    }
  }

  async dataDashboard(id_store: number) {
    try {
      let currentDate = new Date(),
        yesterday = subDays(currentDate, 1);

      //Count booking upcoming
      let book_upcoming = await this.bookingRepo.createQueryBuilder('booking')
        .where('booking.soft_delete IS NULL')
        .andWhere('booking.store_id = :id', { id: id_store })
        .andWhere('booking.book_status <= 4')
        .andWhere('booking.book_date > :start_at', { start_at: startOfDay(currentDate) })
        .getCount();

      //Count all booking in current month
      let book_in_month = await this.bookingRepo.createQueryBuilder('booking')
        .where('booking.soft_delete IS NULL')
        .andWhere('booking.store_id = :id', { id: id_store })
        .andWhere('booking.book_date BETWEEN :start_at AND :end_at', { start_at: startOfMonth(currentDate), end_at: endOfMonth(currentDate) })
        .getCount();

      //Count all order in current day
      let order_in_day = await this.orderRepo.createQueryBuilder('order')
        .select(['order.total_price', 'order.money_owed', 'order.deposit_total'])
        .where('order.soft_delete IS NULL')
        .andWhere('order.store_id = :id', { id: id_store })
        .andWhere('order.status = 3')
        .andWhere('order.order_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(currentDate), end_at: endOfDay(currentDate) })
        .getManyAndCount();

      // Get revenue in current day  
      let revenue = 0;

      for (var item of order_in_day[0]) {
        revenue += item.total_price - item.money_owed
        if (item.deposit_total) {
          revenue -= item.deposit_total
        }
      }


      const transactionTotal = await this.transactionRepo.createQueryBuilder('transaction')
        .where('transaction.store_id = :id', { id: id_store })
        .andWhere('transaction.soft_delete IS NULL')
        .andWhere('transaction.status = 2')
        .andWhere('transaction.created_at BETWEEN :start_at AND :end_at', { start_at: startOfDay(currentDate), end_at: endOfDay(currentDate) })
        .select('SUM(transaction.paid_amount) as total_paid_amount').getRawOne()

      revenue = Number(revenue)
      revenue += Number(transactionTotal.total_paid_amount)

      // let totalPriceInDay =  await queryInDay.select('SUM(paid_amount) as total_paid_amount').getRawOne()

      //Count new customer has booking yesterday
      let customerNew = await this.bookingRepo.createQueryBuilder('booking')
        .where('booking.soft_delete IS NULL')
        .andWhere('booking.store_id = :id', { id: id_store })
        .andWhere('booking.book_date BETWEEN :start_at AND :end_at', { start_at: startOfDay(yesterday), end_at: endOfDay(yesterday) })
        .innerJoinAndSelect("booking.customers", "customer")
        .andWhere(new Brackets(qb => {
          qb.where("customer.created_at BETWEEN :start_at AND :end_at", { start_at: startOfDay(yesterday), end_at: endOfDay(yesterday) })
        }))
        .getCount();

      //Count old customer has booking yesterday  
      let customerOld = await this.bookingRepo.createQueryBuilder('booking')
        .where('booking.soft_delete IS NULL')
        .andWhere('booking.store_id = :id', { id: id_store })
        .andWhere('booking.book_date BETWEEN :start_at AND :end_at', { start_at: startOfDay(yesterday), end_at: endOfDay(yesterday) })
        .innerJoinAndSelect("booking.customers", "customer")
        .andWhere(new Brackets(qb => {
          qb.where("customer.created_at < :start_at", { start_at: startOfDay(yesterday) })
        }))
        .getCount();

      return helper.success({
        'dataBookings': [book_upcoming, book_in_month],
        'dataOrders': [order_in_day[1], revenue],
        'dataCustomers': [customerNew, customerOld],
      });

    } catch (error) {
      return helper.error(error, "order.service.dataDashboard")
    }

  }

  @Cron('0 30 4 * * 0-6')
  async cronRemoveOrderItem() {
    try {
      let deleteOrderItem = await this.orderItemRepo.createQueryBuilder('order_item').where("order_id IS NULL").delete().execute();

      return helper.error("remove order item empty order_id", "order.service.cronRemoveOrderItem");
    } catch (error) {
      return helper.error(error, "order.service.cronRemoveOrderItem")
    }
  }

  // @Cron('0 35 4 * * 0-6')
  // async cronRemovePackage() {
  //   try {
  //     let deletePackage = await this.packagesRepo.createQueryBuilder('package').where("soft_delete IS NOT NULL").delete().execute();
  //     let deleteOrderItem = await this.packagesRepo.createQueryBuilder('package').where("soft_delete IS NOT NULL").delete().execute();

  //     return helper.error("remove package has soft delete", "package.cronRemovePackage");
  //   } catch (error) {
  //     return helper.error(error, "package.cronRemovePackage")
  //   }
  // }

  async syncOweMoneyCustomer(store_id: number) {
    try {
      let dataOrder = await this.orderRepo.createQueryBuilder('order')
        .select(['order.money_owed', 'order.customer_id'])
        .where("order.store_id = :id", { id: store_id })
        .andWhere("order.money_owed > 0")
        .andWhere("order.status = 3")
        .innerJoinAndSelect("order.customers", "customer")
        .getMany();

      let newDataOrder = [];
      dataOrder.map((item) =>
        newDataOrder.push({ owe_money: item.money_owed, customer_id: item.customers.id, current_owe_money: item.customers.owe_money })
      );

      newDataOrder = _.groupBy(newDataOrder, ({ customer_id }) => customer_id);
      Object.entries(newDataOrder).map((item) => {
        newDataOrder[item[0]] = { customer_id: item[0], new_owe_money: item[1][0].current_owe_money + _.sumBy(item[1], function (o) { return o.owe_money; }) };
      })

      let countTime = 0;
      for (let val of Object.entries(newDataOrder)) {
        await this.customerRepo.update(val[0], { owe_money: val[1].new_owe_money })
        if (countTime > 100) {
          countTime = 0
          await new Promise(r => setTimeout(r, 1000));
        }
        countTime++
      }

      return helper.success(newDataOrder);
    } catch (error) {
      console.log(error)
      // return helper.error(error, "order.service.cronRemoveOrderItem")
    }
  }
}