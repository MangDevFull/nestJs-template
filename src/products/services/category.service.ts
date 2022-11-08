import { Injectable } from '@nestjs/common';
import { Category } from '../entities/category.entity' 
import { Product } from '../entities/product.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { UpdateResult, DeleteResult } from  'typeorm';
import * as helpers from '../../helpers/response'
import { error } from 'console';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ) {}

  async findAll ( relations: string[] = [],) {
    try {
      let res =  await this.categoryRepo.
      createQueryBuilder('category')
      .where('category.soft_delete IS NULL')
      .leftJoinAndSelect('category.product', 'product')
      .andWhere('product.soft_delete IS NULL')
      .andWhere('category.type = 1')
      .getMany()
      return helpers.success(res)
    } catch (err) {
      return helpers.error(error,"category.service")
    }
  }

  async findOne (id: number) {
    try {
      let res  =  await this.categoryRepo.findOne({where: {id: id, soft_delete : IsNull()}})
      return helpers.success(res)
    } catch (error) {
      return helpers.error(error,"category.service") 
    }
  }

  async getAllGroupByType (id: number) {
    try {
      let res = await this.categoryRepo.find({where: { type: id, soft_delete : IsNull()}})
      return helpers.success(res)
    } catch (error) {
      return helpers.error(error,"category.service") 
    }
  }


  async create (category: Category, userId: number) {

    try {
      category.created_by =  userId;
      category.updated_by =  userId;
      let res =  await this.categoryRepo.save(category)
      return helpers.success(res)
    } catch (err) {
        return helpers.error(error,"category.service")
    }
  }

  async update(id: number, category: Category, userId) {
    try {
      category.updated_by = userId
      category.updated_at = new Date
      let res =  await this.categoryRepo.update(id, category);
      return helpers.success(res)
    } catch (err) {
      return helpers.error(error,"category.service")
    }
  }

  async delete(id: number){
    try {
        let res =  await this.categoryRepo.update(id, {soft_delete: new Date});
        return helpers.success(res)
    } catch (err) {
      return helpers.error(error,"category.service")
    }
  }

  async GetProductBuyCategory(id: number){
    try {
      let data =  await this.productRepo.find({where: {soft_delete : IsNull(), category_id: id, type: 1}, relations: ['meta']});
      if (data.length > 0) {
        data.map((key, val) => {
          const dataMetaRp = {}
          key.meta.map((item) => {
            dataMetaRp[item["meta_key"]] = item["meta_value"]
          })
          data[val].meta_object = dataMetaRp
        })

      }
      return helpers.success(data)
    } catch (err) {
      return helpers.error(err,"category.service")
    }
  }

}