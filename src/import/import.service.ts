import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull, In, Not } from 'typeorm';
import { Pagination } from '../pagination';
import { Store } from '../stores/stores.entity';
import { Customer } from 'src/customers/entities/customers.entity';
import * as helpers from '../helpers/response'
import { plainToClass } from '@nestjs/class-transformer';
import { CreateCustomerDto } from 'src/customers/dto/create-customer.dto';
import { Category } from 'src/products/entities/category.entity';
import { Product } from 'src/products/entities/product.entity';
import { ProductMeta } from 'src/products/entities/product-meta.entity';
import { User } from 'src/users/users.entity';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { Package } from 'src/package/package.entity';
import { Order } from 'src/orders/entities/orders.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import * as bcrypt from 'bcrypt';
import { Transaction } from 'src/transaction/transaction.entity';
import async from "async"
import { forEach } from 'lodash';



@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductMeta)
    private readonly productMetaRepo: Repository<ProductMeta>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Package)
    private readonly packageRepo: Repository<Package>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,




  ) { }

  async importCustomer() {
    const results = [];
    // const data = [];
    const csv = require("csv-parser")
    require("fs").createReadStream("src/import/file/customer.csv")
      .pipe(csv({}))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        this.handleCustomer(results)
      })
  }

  async handleCustomer(results: any[]) {
    const data = []

    const stores = await this.storeRepo.findBy({ soft_delete: IsNull() })
    results.map((key, val) => {
      let customer = new Customer
      var costomerDto = new CreateCustomerDto
      customer.code = key.code
      customer.full_name = key.full_name
      customer.email = key.email
      customer.mobile = key.mobile
      customer.facebook_id = key.mobile
      var gender = 1
      if (key.gender == "Nữ") {
        gender = 2
      }
      if (key.birthday != '') {
        let arrUnit = key.birthday.split("/");
        customer.day_birthday = arrUnit[0]
        customer.month_birthday = arrUnit[1]
      }
      customer.gender = gender
      customer.zalo_account = key.zalo
      customer.zalo_account = key.card_code
      customer.birthday = key.birthday
      customer.loyalty_point = Number(key.loyalty_point)
      customer.job = key.job
      customer.id_card = key.card_code
      customer.address = key.address
      customer.city = key.city_name
      customer.district = key.district
      customer.country = key.country_code
      customer.note = key.node
      customer.created_at = new Date(key.createdAt)
      customer.updated_at = new Date(key.createdAt)
      customer.ranking =  this.handleRank(key.rank)
      stores.map((item) => {
        if (key.location == item.name_store) {
          costomerDto.stores = [item.id]
        }
      })

      let customerData = this.customerRepo.create(customer)

      if (costomerDto.stores) {
        const storeId = (costomerDto.stores).map((item) =>
          this.storeRepo.create({ id: item })
        );
        customerData = this.customerRepo.create({
          ...customerData,
          stores: storeId
        });
      }

      data.push(customerData)
    })

    this.customerRepo.save(data)
  }
  

  async importCategorySv() {
    const results = [];
    // const data = [];
    const csv = require("csv-parser")
    require("fs").createReadStream("src/import/file/group_sv.csv")
      .pipe(csv({}))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        this.handleCategorySv(results)
      })
  }

  async handleCategorySv(results: any[]) {
    const data = [];
    results.map((key, val) => {
      const category = new Category;
      category.name = key.group_name
      category.type = key.type
      data.push(category)
    })

    this.categoryRepo.save(data)
  }

  async importProductSv() {
    const results = [];
    // const data = [];
    const csv = require("csv-parser")
    require("fs").createReadStream("src/import/file/service.csv")
      .pipe(csv({}))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        this.handleProductSv(results)
      })
  }

  async handleProductSv(results: any[]) {
    // const data = []
    const categorys = await this.categoryRepo.findBy({ soft_delete: IsNull() })
    results.map(async (key, val) => {
      let product = new Product
      let hour = ''
      let minute = ''

      product.product_name = key.product_name
      product.code = key.code
      product.description = key.description
      product.price = Number(key.price)
      product.product_name_e = key.product_name_e
      product.description_e = key.description_e
      product.type = 1
      product.status = 1

      categorys.map((item) => {
        if (item.name == key.group_id) {
          product.category_id = item.id
        }
      })

      if (key.meta != '') {
        let time = Number(key.meta)
        let minuteInt = time % 60
        let hourInt = (time - minuteInt) / 60
        hour = String(hourInt)
        minute = String(minuteInt)
      }

      const productCreate = await this.productRepo.save(product)
      let productMetas = [
        { meta_key: 'hour', meta_value: hour, product_id: productCreate.id },
        { meta_key: 'minute', meta_value: minute, product_id: productCreate.id },
        { meta_key: 'status_edit_price', meta_value: '2', product_id: productCreate.id },
        { meta_key: 'status_print_hour', meta_value: '2', product_id: productCreate.id },
      ]

      this.productMetaRepo.save(productMetas)
    })
  }

  async importProudtcCard() {
    const results = [];
    // const data = [];
    const csv = require("csv-parser")
    require("fs").createReadStream("src/import/file/service_card.csv")
      .pipe(csv({}))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        this.handleProductCard(results)
      })
  }

  async handleProductCard(results: any[]) {
    // const data = []
    const categorys = await this.categoryRepo.findBy({ soft_delete: IsNull() })
    results.map(async (key, val) => {
      let product = new Product
      product.product_name = key.product_name
      product.code = key.code
      product.description = key.description
      product.price = Number(key.price)
      product.type = 2
      product.status = 1

      categorys.map((item) => {
        if (item.name == "Thẻ tiền" && key.card_type == "1") {
          product.category_id = item.id
        }
        if (item.name == "Thẻ lần" && key.card_type == "2") {
          product.category_id = item.id
        }
      })
      const productCreate = await this.productRepo.save(product)
      let productMetas = [
        { meta_key: 'max_used', meta_value: key.max_used, product_id: productCreate.id },
        { meta_key: 'card_type', meta_value: key.card_type, product_id: productCreate.id },
        { meta_key: 'status_edit_price', meta_value: key.status_edit_price, product_id: productCreate.id },
        { meta_key: 'price_one_used', meta_value: key.price_one_used, product_id: productCreate.id },
        { meta_key: 'use_time_month', meta_value: key.use_time_month, product_id: productCreate.id },
        { meta_key: 'card_account', meta_value: key.card_account, product_id: productCreate.id },
        { meta_key: 'time_using', meta_value: key.time_using, product_id: productCreate.id },
      ]
      this.productMetaRepo.save(productMetas)
    })
  }

  async importProudct() {
    const results = [];
    // const data = [];
    const csv = require("csv-parser")
    require("fs").createReadStream("src/import/file/product.csv")
      .pipe(csv({}))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        this.handleProduct(results)
      })
  }

  async handleProduct(results: any[]) {
    // const data = []
    const categorys = await this.categoryRepo.findBy({ soft_delete: IsNull() })
    results.map(async (key, val) => {
      let product = new Product
      product.product_name = key.product_name
      product.code = key.code
      product.description = key.description
      product.price = Number(key.price)
      product.base_price = Number(key.base_price)
      product.type = 3
      product.status = 1

      categorys.map((item) => {
        if (item.name == key.category) {
          product.category_id = item.id
        }
      })
      let unit = '';
      let amount = '';
      if (key.unit != '') {
        let arrUnit = key.unit.split(" ");
        amount = arrUnit[0]
        unit = arrUnit[1]
      }

      const productCreate = await this.productRepo.save(product)
      let productMetas = [
        { meta_key: 'brand', meta_value: key.brand, product_id: productCreate.id },
        { meta_key: 'unit', meta_value: unit, product_id: productCreate.id },
        { meta_key: 'amount', meta_value: amount, product_id: productCreate.id },
        {meta_key:'count_unit', meta_value:key.count_unit,product_id: productCreate.id}
      ]
      this.productMetaRepo.save(productMetas)
    })
  }

  async importUser() {
    const results = [];
    // const data = [];
    const csv = require("csv-parser")
    require("fs").createReadStream("src/import/file/user.csv")
      .pipe(csv({}))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        this.handleUser(results)
      })
  }

  async handleUser(results: any[]) {
    const data = []

    const stores = await this.storeRepo.findBy({ soft_delete: IsNull() })
    results.map(async (key, val) => {
      let user = new User
      var userDto = new CreateUserDto
      user.name = key.name
      if (!key.email) {
        key.email = "cent" + val + "@gmail.com"
      }
      user.email = key.email
      user.password = await this.hashPassword('cent123');
      user.mobile = key.mobile
      user.role = Number(key.role)
      user.group = key.group
      user.status = Number(key.status)
      user.position = key.position
      var storesArr = key.stores.split(', ')
      userDto.stores = []
      stores.map((item) => {
        if (storesArr.includes(item.name_store)) {
          userDto.stores.push(item.id)
        }
      })

      let userData = this.userRepo.create(user)

      if (userDto.stores) {
        const storeId = (userDto.stores).map((item) =>
          this.storeRepo.create({ id: item })
        );
        userData = this.userRepo.create({
          ...userData,
          stores: storeId
        });
      }
      return await this.userRepo.save(userData);
    })
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    let passwordHash = await bcrypt.hash(password, salt);
    return passwordHash;
  }

  async importCustomerUsedCard(query) {
    console.log(query.type)
    const results = [];
    var filePath = ""

    switch (query.type) {
      case 'nvh': filePath = "src/import/file/Khach_hang_dung_the_NVH.csv"; break;
      case 'tdh': filePath = "src/import/file/Khach_hang_dung_the_TDH.csv"; break;
      case 'q3': filePath = "src/import/file/Khach_hang_dung_the_Q3.csv"; break;
      case 'vvd': filePath = "src/import/file/Khach_hang_dung_the_VVD.csv"; break;
      default:
        break;
    }

    const csv = require("csv-parser")
    require("fs").createReadStream(filePath)
      .pipe(csv({}))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        // console.log(results)
        this.handleCustomerUsedCard(results)
      })

    return true
  }

  async handleCustomerUsedCard(results: any[]) {
    const data = []
    const stores = await this.storeRepo.findBy({ soft_delete: IsNull() })
    const products = await this.productRepo.findBy({ soft_delete: IsNull() })
    const customers = await this.customerRepo.findBy({ soft_delete: IsNull() })

    results.map((key, val) => {
      var packageData = new Package
      packageData.order_code = key.order_code
      packageData.package_code = key.package_code
      packageData.customer_name = key.customer_name
      packageData.customer_mobile = key.customer_mobile
      packageData.product_name = key.product_name
      packageData.type = key.type
      packageData.note = key.node
      packageData.date_of_issue = new Date(key.date_of_issue_datetime)
      packageData.expiration_date = new Date(key.expiration_date_time)
      if (key.last_used != '') {
        packageData.last_used = new Date(key.last_used_date_time)
      }
      packageData.price_of_card = Number(key.price_of_card)
      packageData.initial_amount = Number(key.initial_amount)
      packageData.max_used = Number(key.max_used)
      packageData.count_used = Number(key.count_used)
      packageData.sale_card = Number(key.sale_card)
      stores.map((item) => {
        if (key.store == item.name_store) {
          packageData.store_id = item.id
        }
      })
      packageData.created_at = new Date(key.date_of_issue_datetime)

      products.map((item) => {
        if (key.product_name.toUpperCase() == item.product_name.toUpperCase()) {
          packageData.product_id = item.id
        }
      })

      customers.map((item) => {
        if (key.customer_mobile == item.mobile) {
          packageData.customer_id = item.id
        }
      })
      let status = 1 // Sử dụng
      if (key.status == "Đã khóa") {
        status = 2
      } else if (key.status == "Hết hạn") {
        status = 3
      } else if (key.status == "Hoàn thành") {
        status = 4
      }
      packageData.status = status

      data.push(packageData)
    })

    await this.packageRepo.save(data)
  }

  async importOrder(query) {

    var filePath = ""
    var storeName = ""

    switch (query.type) {
      case 'nvh': {
        filePath = "src/import/file/order/chi_tiet_hoa_don_NVH1.csv";
        storeName = "Cent Beauty Nguyễn Văn Huyên";
        break;
      }
      case 'tdh': {
        filePath = "src/import/file/order/Khach_hang_dung_the_TDH.csv";
        storeName = "Cent Beauty Trần Duy Hưng";
        break;
      }
      case 'q3': {
        filePath = "src/import/file/order/chi_tiet_hoa_don_Q3.csv";
        storeName = "SG - Cent Beauty Q3";
        break;
      }
      case 'vvd': {
        filePath = "src/import/file/order/chi_tiet_hoa_don_VVD.csv";
        storeName = "Cent Beauty Võ Văn Dũng";
        break;
      }
      default:
        break;
    }

    const results = [];
    const csv = require("csv-parser")
    require("fs").createReadStream(filePath)
      .pipe(csv({}))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        this.handleImportOrder(results, storeName)
      })
  }

  async handleImportOrder(results: any[], storeName: string) {
    const data = []
    const stores = await this.storeRepo.findBy({ soft_delete: IsNull() })
    const products = await this.productRepo.findBy({ soft_delete: IsNull() })
    const customers = await this.customerRepo.findBy({ soft_delete: IsNull() })

    var orderCodes = []
    var orderId = 0
    var orderCode = ''
    var totalPrice = 0
    var discountByTotalBill = 0
    var totalPriceBefore = 0
    for (let key of results) {
      var orderItem = new OrderItem
      // orderCodes.push(key.order_code)
      if (!orderCodes.includes(key.order_code)) {
        // orderId = val
        var order = new Order
        orderCodes.push(key.order_code)
        order.order_code = key.order_code
        let orderAt = await this.handleDate(key.order_at)
        order.order_at = new Date(orderAt)
        order.customer_name = key.customer_name
        order.created_name = key.created_name
        order.payment_type = key.payment_type
        order.source_from = key.source_from;
        order.status = await this.handleStatus(key.status)
        order.description = key.description
        order.staff_booking = key.staff_booking
        order.created_at = new Date(orderAt)
        order.updated_at = new Date(orderAt)

        customers.map((item) => {
          if (item.mobile == key.customer_mobile) {
            order.customers = this.customerRepo.create({ id: item.id })
          }
        })

        stores.map((itemStores) => {
          if (itemStores.name_store == storeName) {
            order.stores = this.storeRepo.create({ id: itemStores.id })
          }
        })

        await this.orderRepo.save(order)
        orderId = order.id
        totalPrice = 0
        discountByTotalBill = 0
        totalPriceBefore = 0
      }
      if (orderId != 0) {
        console.log(key.order_code, orderId)
        orderItem.order = order
        if (order.status == 3) {
          orderItem.package_code = key.package_code
        }
        orderItem.product_name = key.product_name
        orderItem.quantity = Number(key.quantity) ? Number(key.quantity) : 0
        orderItem.price = Number(key.price_product) == 0 ? Number(key.price_product) : Number(key.price_product)/Number(key.quantity)
        
        orderItem.discount = Number(key.discount_product)
        products.map((item) => {
          if (item.product_name === key.product_name) {
            orderItem.product = item
            orderItem.product_code = item.code
          }
        })
        orderItem.amount_deducted_from_membership_card = Number(key.amount_deducted_from_membership_card) ? Number(key.amount_deducted_from_membership_card) : 0
        orderItem.employee_service_name1 = key.employee_service_name1
        orderItem.employee_service_name2 = key.employee_service_name2
        orderItem.employee_service_name3 = key.employee_service_name3
        orderItem.employee_service_name4 = key.employee_service_name4
        orderItem.employee_service_name5 = key.employee_service_name5
        orderItem.sommission_service1 = Number(key.sommission_service1) ? Number(key.sommission_service1) : 0
        orderItem.sommission_service2 = Number(key.sommission_service2) ? Number(key.sommission_service2) : 0
        orderItem.sommission_service3 = Number(key.sommission_service3) ? Number(key.sommission_service3) : 0
        orderItem.sommission_service4 = Number(key.sommission_service4) ? Number(key.sommission_service4) : 0
        orderItem.sommission_service5 = Number(key.sommission_service5) ? Number(key.sommission_service5) : 0
        orderItem.employee_consultant_name1 = key.employee_consultant_name1
        orderItem.employee_consultant_name2 = key.employee_consultant_name2
        orderItem.employee_consultant_name3 = key.employee_consultant_name3
        orderItem.employee_consultant_name4 = key.employee_consultant_name4
        orderItem.employee_consultant_name5 = key.employee_consultant_name5
        orderItem.sommission_consultant1 = Number(key.sommission_consultant1) ? Number(key.sommission_consultant1) : 0
        orderItem.sommission_consultant2 = Number(key.sommission_consultant2) ? Number(key.sommission_consultant2) : 0
        orderItem.sommission_consultant3 = Number(key.sommission_consultant3) ? Number(key.sommission_consultant3) : 0
        orderItem.sommission_consultant4 = Number(key.sommission_consultant4) ? Number(key.sommission_consultant4) : 0
        orderItem.sommission_consultant5 = Number(key.sommission_consultant5) ? Number(key.sommission_consultant5) : 0
        await this.orderItemRepo.save(orderItem)

        totalPriceBefore += Number(key.price_product)
        discountByTotalBill += Number(key.discount_by_total_bill)
        totalPrice += Number(key.total_price_after_discount)
        await this.orderRepo.update(orderId, { total_price: totalPrice, total_price_before: totalPriceBefore, discount_by_total_bill: discountByTotalBill })
      }

    }

  }

  async handleDate(date: string) {
    var dateAr = date.split("/")
    var newDate = dateAr[1] + '/' + dateAr[0] + '/' + dateAr[2]
    return newDate
  }

  async handleStatus(string: string) {
    var type = 1
    switch (string) {
      case 'Đã xóa': type = 2; break;
      case 'Thành công': type = 3; break;
      default:
        type = 1  // nhiều loại
        break;
    }

    return type
  }

   handleRank(string: string) {
    var type = 1
    switch (string) {
      case 'Bạc': type = 2; break;
      case 'Vàng': type = 3; break;
      case 'Bạch kim': type = 4; break;
      case 'Kim cương': type = 5; break;
      default:
        type = 1  // nhiều loại
        break;
    }

    return type
  }



  async importStore(query) {

    const results = [];
    var filePath = "src/import/file/Store.csv"
    const csv = require("csv-parser")
    require("fs").createReadStream(filePath)
      .pipe(csv({}))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        this.handleImportSore(results)
      })
  }

  async handleImportSore(results: any[]) {
    var data = [];

    results.map((item) => {
      var store = new Store;
      store.name_store = item.name_store
      store.description = item.description
      store.mobile = item.mobile
      store.address = item.address
      store.city = item.city
      store.district = item.district
      store.country = item.country
      store.google_map = item.google_map
      data.push(store)
    })

    await this.storeRepo.save(data)
  }

  async importTransaction(query) {
    const results = [];
    var filePath = "src/import/file/transtion.csv"
    const csv = require("csv-parser")
    require("fs").createReadStream(filePath)
      .pipe(csv({}))
      .on('data', (data) => results.push(data))
      .on('end', () => {
        this.handleImportTransaction(results)
      })
  }

  async handleImportTransaction(results: any[]) {
    var data = [];

    var orderCodes = []
    results.map((item) => {
      orderCodes.push(item.order_code)
    })
    var store = await this.storeRepo.find({ where: { soft_delete: IsNull() } })
    var orders = await this.orderRepo.find({ where: { order_code: In(orderCodes) } })
    for (let item of results) {
      var transaction = new Transaction
      transaction.created_at = new Date(item.last_date)
      transaction.paid_amount = Number(item.paid_amount)
      transaction.remain_amount = Number(item.remain_amount)
      transaction.total_amount = Number(item.total_price_order)
      store.map((itemStore) => {
        if (itemStore.name_store == item.store) {
          transaction.store_id = itemStore.id
        }
      })

      orders.map((orderItem, key) => {
        if (orderItem.order_code == item.order_code) {
          orders[key].money_owed = Number(item.remain_amount)
          let order = this.orderRepo.create({ id: orderItem.id })
          transaction = this.transactionRepo.create({
            ...transaction,
            order: order
          })
        }
      })
      var transactionN = await this.transactionRepo.save(transaction)
      var transactionCode = "GD" + await this.addLeadingZeros(transactionN.id, 6)
       await this.transactionRepo.update(transactionN.id, {transaction_code:transactionCode})
    }

    await this.orderRepo.save(orders)
  }

  async addLeadingZeros(num, totalLength) {
    return String(num).padStart(totalLength, '0');
  }

  async updateOrderItem() {
    try{
      var data = []
      var packages = await this.packageRepo.find({
        where:{
          soft_delete: IsNull()
        }
      })
      var orderItems= await this.orderItemRepo.find({
        where: {
          package_code: Not(IsNull())
        }
      })
      let countTime = 0
      for (let val of orderItems) {
          let orderItems = this.orderItemRepo.create(val)
          packages.map((valPk, keyPk) => {
              if (val.package_code === valPk.package_code) {
                  var packageCreate = this.packageRepo.create({id: valPk.id})
                  orderItems = this.orderItemRepo.create({
                    ...orderItems,
                    package: packageCreate
                  })
    
              }
          })
          if (orderItems.package) {
            await this.orderItemRepo.save(orderItems)
          }
          if (countTime > 100 ) {
            countTime = 0
            await new Promise(r => setTimeout(r, 1000));
          }
          countTime ++
      }
      
      return true
    } catch (err) {
      console.log(err)
    }
  
  }

  async sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }


  async addTrasaction() {
    var transactions = await this.transactionRepo.find({
      relations: {
        order: true
      },
      select:{
        order: {
          id: true
        }
      }
    })
    var orderIds = []
    transactions.map((val, key) => {
      if (val.order) {
        orderIds.push(val.order.id)
      }
    })
    var orders = await this.orderRepo.createQueryBuilder('order')
        .where("order.id NOT IN (:...id)", { id: orderIds })
        .andWhere("order.status != 1")
        .leftJoinAndSelect("order.stores", "stores")
        .getMany()
    for (let val of orders) {
        let orderTransaction = this.orderRepo.create({id: val.id})
        let transaction = {
          paid_amount : val.total_price,
          total_amount : val.total_price,
          remain_amount : val.money_owed,
          status : 1,
          store_id : val.stores ? val.stores.id : null,
          pay_type : val.payment_type,
          created_at : val.created_at,
          updated_at : val.created_at,
          order : orderTransaction
        }
        transaction = this.transactionRepo.create({
          ...transaction,
          order: orderTransaction
        })

       var transactionN = await this.transactionRepo.save(transaction)
       var transactionCode = "GD" + await this.addLeadingZeros(transactionN.id, 6)
       await this.transactionRepo.update(transactionN.id, {transaction_code:transactionCode})
    }
   
    return true
   
  }

  async updateNewPackageOrderItem() {
    var orderItems = await this.orderItemRepo.createQueryBuilder('order_item')
      .where('order_item.price  > 0')
      .innerJoinAndSelect('order_item.product', 'product')
      .andWhere('product.type = 2')
      .getMany()

      let countTime = 0
      var itemId = []
      for(let item of orderItems) {

        await this.orderItemRepo.update(item.id, {new_package: true})
        console.log(item.id, item.product.type, item.price)
        itemId.push(item.id)
        if (countTime > 1000 ) {
          countTime = 0
          await new Promise(r => setTimeout(r, 1000));
        }
        countTime ++
      }


     return itemId

    //  var orderItems = await this.orderItemRepo.createQueryBuilder('order_item')
    //   .where('order_item.price  > 0')
    //   .leftJoinAndSelect('order_item.product', 'product')
    //   .andWhere('product.id is null')
    //   .getMany()

    //   var productNam = []
    //   for (let item of orderItems) {
    //       if (!productNam.includes(item.product_name)) {
    //         productNam.push(item.product_name)
    //       }
    //   }



    //   return [productNam]
  }

}