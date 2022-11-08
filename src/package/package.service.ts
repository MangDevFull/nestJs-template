import { Injectable, Query } from '@nestjs/common';
import { Package } from './package.entity'
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { UpdateResult, DeleteResult, NotBrackets, Brackets, MoreThan, In } from 'typeorm';
import * as helpers from '../helpers/response'
import { format, startOfDay, endOfDay } from 'date-fns'
import { PackageListParam } from './interface/package.interfaces';
import { Customer } from 'src/customers/entities/customers.entity';
import { Product } from 'src/products/entities/product.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { Credit } from 'src/credit/entities/credit.entity'
import { error } from 'console';
import async from "async"
let _ = require('lodash');

@Injectable()
export class PackageService {
  constructor(
    @InjectRepository(Package)
    private readonly packagesRepo: Repository<Package>,

    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,

    @InjectRepository(Credit)
    private readonly creditRepo: Repository<Credit>,
  ) { }

  async findAll(
    param: PackageListParam,
    relations: string[] = []
  ) {
    try {
      const takeRecord = param.take || 30;
      const paginate = param.page || 1;
      const skip = (paginate - 1) * takeRecord;

      var query = this.packagesRepo.createQueryBuilder('package')
        .where('package.soft_delete IS NULL')
        .innerJoinAndSelect("package.customer", "customer")
        .leftJoinAndSelect("package.product", "product")
        .innerJoinAndSelect("package.store", "store")
        .orderBy("package.id", "DESC");


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
      const newQuery = query
      var res = await query.orderBy("package.id", "DESC").take(takeRecord).skip(skip).getMany();
      
      return async.parallel({
          total: (cb) => {
            query.getCount().then(rs => {
              cb(null, rs)
            })
          },
          countCustomerUsing: (cb) => {
            newQuery.select('COUNT(DISTINCT(package.customer_id))', 'count_customer').getRawOne()
            .then(rs => {
              cb(null, rs.count_customer)
            });
          },
          totalTimesCard: (cb) => {
            newQuery.andWhere('package.type = :type', {type: 'Thẻ lần'})
            .select('SUM(package.sale_card)', 'mony')
            .getRawOne().then(rs => {
              cb(null, rs.mony)
            });
          },
          totalMonyCard: (cb) => {
            newQuery.andWhere('package.type = :type', {type: 'Thẻ tiền'})
            .select('SUM(package.sale_card)', 'mony')
            .getRawOne().then(rs => {
              cb(null, rs.mony)
            });
          }
      }).then(rs => {
        rs['data'] = res
        return helpers.success(rs)
      })
      
    } catch (err) {
      return helpers.error(err,"package.service")
    }
  }

  async findOne(id: number) {
    try {
      let res = await this.packagesRepo.findOne({ where: { id: id, soft_delete: IsNull() } })
      return helpers.success(res)
    } catch (error) {
      return helpers.error(error,"package.service")
    }
  }

  async findByCustomer(id: number) {
    try {
      let res = await this.packagesRepo.findAndCount({
        where: {
          customer_id: id,
          soft_delete: IsNull(),
          expiration_date:  MoreThan(new Date()),
          status: 1
        },
        order: {
          id: "DESC"
        },
        relations: ['product']
      })
      return helpers.success({listPackage: res[0], total: res[1]})
    } catch (error) {
      return helpers.error(error,"package.service")
    }
  }


  async createPackage(packageDto, userId: number) {

    try {
      let data = [];
      let customer = await this.customerRepo.findOne({ where: { id: packageDto.customer_id } })
      let product = await this.productRepo.findOne({ where: { id: packageDto.product_id } })

      for (let i = 0; i <= packageDto.quantity; i++) {
        packageDto.date_of_issue = new Date(packageDto.date_of_issue);
        packageDto.expiration_date = new Date(packageDto.expiration_date);
        packageDto.customer_name = customer.full_name,
        packageDto.customer_mobile = customer.mobile,
        packageDto.product_name = product.product_name
        packageDto.created_by = userId;
        packageDto.updated_by = userId;
        let res = await this.packagesRepo.save(packageDto)
        let packageCode = "MQ" + await this.addLeadingZeros(res.id, 5)
        res.package_code = packageCode
        await this.packagesRepo.update(res.id, { package_code: packageCode })
        data.push(res)
      }

      return helpers.success(data)

    } catch (err) {
      return helpers.error(error,"package.service")
    }
  }

  async addLeadingZeros(num, totalLength) {
    return String(num).padStart(totalLength, '0');
  }

  async update(id: number, packages: Package, userId) {
    try {
      var customer = await this.customerRepo.findOne({ where: { id: packages.customer_id } })
      packages.customer_name = customer.full_name
      packages.customer_mobile = customer.mobile
      packages.expiration_date = new Date(packages.expiration_date);
      if (new Date > new Date(packages.expiration_date) &&  packages.status == 3) {
        packages.status = 1
      }
      let res = await this.packagesRepo.update(id, packages);
      return helpers.success(res)
    } catch (err) {
      return helpers.error(error,"package.service")
    }
  }

  async countCustomerUsing() {
    var count = this.customerRepo.createQueryBuilder("customer")
      .addSelect("COUNT(customer.i)", "count")
      .leftJoinAndSelect("package.customer", "customer")
      .groupBy("customer.id")
      .getRawMany();
    return count;
  }

  async delete(id: number) {
    try {
      let res = await this.packagesRepo.update(id, { soft_delete: new Date });
      return helpers.success(res)
    } catch (err) {
      return helpers.error(error,"package.service")
    }
  }

  async changeStatus(request, id: number) {
    try {
       let status = request.query.status
       let res = await this.packagesRepo.update(id, {status: status})
       return helpers.success(res)
    } catch (err) {
      return helpers.error(error,"package.service")
    }
  }

  async getItemHistory(code: string) {
    try {
      let res = await this.orderItemRepo.find({
        where:{
          package_code: code,
          order: {
            status: 3
          }
        },
        relations:{
          order: {
            stores:true,
          }
        },
        select: {
          order: {
            id: true,
            order_code: true,
            order_at: true,
            description: true
          }
        }
      })
      return helpers.success(res)
    } catch (err) {
      return helpers.error(error,"package.service")
    }
  }

  async convertPackageToCredit(store_id: number, params: any) {
    try {
      let productId = params.product_id.split(',');

      let res = await this.packagesRepo.createQueryBuilder('package')
      .select(['package.id', 'package.package_code', 'package.customer_id', 'package.price_of_card', 'package.order_code'])
      .where('package.soft_delete IS NULL')
      .andWhere('package.store_id = :id', { id: store_id })
      .andWhere('package.status = 1')
      .andWhere('package.price_of_card != 0')
      // .andWhere('package.product_id IN (:...product_id)', { product_id: [104, 105, 106, 111, 112] })
      .andWhere('package.product_id IN (:...product_id)', { product_id: productId})
      .innerJoinAndSelect("package.customer", "customer")
      .innerJoinAndSelect("package.store", "store")
      .getMany();

      let listPackage = await _.groupBy(res, ({ customer_id }) => customer_id);
      let packageId = await _.map(res, 'id');

      let listCustomer = [];
      let listCustomerId = await _.map(res, 'customer_id');
      listCustomerId = _.uniqBy(listCustomerId);

      let countTime = 0
      for (let val of listCustomerId) {
        if (listPackage[val]) {
          let deposit_money = _.sumBy(listPackage[val], function(o) { return o.price_of_card; });
          listCustomer.push({id: val, deposit_money: deposit_money})

          for (let item of listPackage[val]) {
            deposit_money +=  item.customer.deposit_money
            await this.creditRepo.save({
              customer_id: item.customer_id,
              old_price: item.customer.deposit_money,
              new_price: item.price_of_card,
              change_price: item.price_of_card,
              note: "Tự động chuyển đổi thẻ cọc sang tiền",
              reason: "Thẻ cọc",
              store_id: item.store.id,
              store_name: item.store.name_store,
              created_by: 1,
              created_by_name: "admin",
              order_code: item.order_code
            });
          }
          
          await this.customerRepo.update(val, {deposit_money: deposit_money})
          if (countTime > 100 ) {
            countTime = 0
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        countTime ++
      }

      let updatePackage = await this.packagesRepo.update(packageId, {status: 4})
      
      return helpers.success(res)
    } catch (err) {
      console.log(err)
      // return helpers.error(error,"package.service")
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
