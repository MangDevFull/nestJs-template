import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Store } from "src/stores/stores.entity"
import * as helper from '../helpers/response'
import { Category } from "src/products/entities/category.entity"
import { Product } from 'src/products/entities/product.entity';
import { Customer } from "src/customers/entities/customers.entity"
let _ = require('lodash');;

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) { }
  async getStoresByName(query: any) {
    const { name } = query
    try {
      const data = await this.storeRepository.find({
        where: {
          city: name,
          soft_delete: IsNull(),
        }
      })
      return helper.success(data)
    } catch (error) {
      return helper.error(error)
    }
  }

  async findAllStore() {
    try {
      const stores = await this.storeRepository.find({
        where: {
          soft_delete: IsNull(),
          name_store: Not("Test")
        }
      })

      const grouped = _.groupBy(stores, (x) => x.city)
      return helper.success(Object.entries(grouped))

    } catch (error) {
      console.log(error)
      return helper.error(error)
    }
  }
  async getAllCategory() {
    try {
      const cate = await this.categoryRepository.find()
      return helper.success(cate)
    } catch (error) {
      console.log(error)
      return helper.error(error)
    }
  }
  async getAllProduct() {
    try {
      const products = await this.productRepository.find({
        where: {
          category_id: In([1, 2, 4, 5]),
          soft_delete: IsNull()
        }
      })
      return helper.success(products)
    } catch (error) {
      console.log(error)
      return helper.error(error)
    }
  }
  async checkCustomerIsExist(id: number) {
    try {
      const customer = await this.customerRepository.findOne({
        where: {
          id: id
        }
      })
      if (!customer) return helper.notFound("Không thấy khách hàng đó")

      return helper.success(null)
    } catch (error) {
      console.error(error)
      return helper.error(error)
    }
  }
}
