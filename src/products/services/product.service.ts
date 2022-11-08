import { Injectable, Request } from '@nestjs/common';
import { Product } from '../entities/product.entity'
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, IsNull, Brackets } from 'typeorm';
import { CreateProductDto } from '../dto/create-product.dto';
import { ProductMeta } from '../entities/product-meta.entity';
import { CreateProductMetaDto } from '../dto/create-product-meta.dto';
import { ProductListParam } from '../interfaces/product.interfaces';
import { Pagination } from 'src/pagination';
import { Category } from '../entities/category.entity';
import { plainToClass } from '@nestjs/class-transformer';
import * as helpers from '../../helpers/response'

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductMeta)
    private readonly productMetaRepo: Repository<ProductMeta>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>
  ) { }

  async findAll(
    query: ProductListParam,
    relations: string[] = [],
    throwsException = false,
  ) {

    const takeRecord = query.take || 500;
    const paginate = query.page || 1;
    const skip = (paginate - 1) * takeRecord;
    var type = 1
    if (typeof query.type != 'undefined' && Number(query.type)) {
      type = Number(query.type)
    }
    try {
      var queryData = this.productRepo.createQueryBuilder('product')
        .where('product.soft_delete IS NULL')
        .orderBy("product.id", "DESC")
        .innerJoinAndSelect("product.meta", "meta")
      if (type != 2) {
        queryData = queryData.innerJoinAndSelect("product.category", "category")
      }
      if (query.keyword && typeof query.keyword != 'undefined') {
        queryData = queryData.andWhere(new Brackets(qb => {
          qb.where("product.product_name like :keyword", { keyword: `%${query.keyword}%` })
            .orWhere("product.code = :keyword", { keyword: `%${query.keyword}%` })
        }))
      }
      queryData = queryData.andWhere('product.type = :type', { type: type })
      var totalData = await queryData.getCount()

      var data = await queryData.take(takeRecord).skip(skip).getMany()
      var dataNew = [];
      if (data.length > 0) {
        data.map((key, val) => {
          const dataMetaRp = {}
          key.meta.map((item) => {
            dataMetaRp[item["meta_key"]] = item["meta_value"]
          })
          data[val].meta_object = dataMetaRp
          if (query.type_meta && typeof query.type_meta != 'undefined' && Number(query.type_meta) != 0) {
            if (data[val].meta_object["card_type"] == query.type_meta) {
              dataNew.push(data[val])
            }
          } else {
            dataNew.push(data[val])
          }

        })
      }
      if (type == 2) {
        let queryMumberCard = queryData;
        var totalMumberCard = await this.getDataTypeCart(queryMumberCard, '1')
        var totalMoneyCard = await this.getDataTypeCart(queryMumberCard, '2')
      }

      var res = {
        data: dataNew,
        total: totalData,
        totalMumberCard: totalMumberCard,
        totalMoneyCard: totalMoneyCard,
      }

      return helpers.success(res)
    } catch (err) {
      return helpers.error(err,"product.service")
    }

  }

  async getDataTypeCart(query, type: string) {
    var count = query.andWhere("meta.meta_key = :metaKey AND meta.meta_value = :metaValue", { metaKey: "card_type", metaValue: type }).getCount()
    return count
  }

  async findOne(
    id: number,
    relations: string[] = [],
    throwsException = false
  ) {
    try {
      const product = await this.productRepo.findOne({
        where: { id },
        relations
      })
      const dataMetaRp = {}
      if (product) {
        product.meta.map((item) => {
          dataMetaRp[item["meta_key"]] = item["meta_value"]
        })
        product.meta_object = dataMetaRp
      }

      return helpers.success(product)
    } catch (err) {
      return helpers.error(err,"product.service")
    }
  }


  async create(product: Product, productDto: CreateProductDto, userId: number) {
    productDto.created_by = userId;
    productDto.updated_by = userId;

    try {
      let category = this.categoryRepo.create({ id: productDto.category_id })
      let data: any;
      if (!productDto.base_price) {
        productDto.base_price = 0
      }
      let createProduct = this.productRepo.create(
        {
          ...productDto,
          category: category
        });

      let saveProduct = await this.productRepo.save(createProduct)
      if (productDto.meta_object) {
        let arrProductDto = Object.entries(productDto.meta_object);
        data = await this.handleDataProductMeta(arrProductDto, saveProduct.id)
      }
      await this.productMetaRepo.save(data);
      if (!productDto.code && typeof productDto.code) {
        var code = "DVM" + (await this.addLeadingZeros(saveProduct.id, 6))
        await this.productRepo.update(saveProduct.id, { code: code })
      }
      return helpers.success(saveProduct)
    } catch (err) {
      return helpers.error(err,"product.service")
    }
  }

  async addLeadingZeros(num, totalLength) {
    return String(num).padStart(totalLength, '0');
  }

  async update(id: number, productDto: CreateProductDto, user_id: number) {

    try {
      var data: any
      if (productDto.meta_object) {
        let arrProductDto = Object.entries(productDto.meta_object);
        data = await this.handleDataProductMetaUpdate(arrProductDto, id)
      }
      await this.productMetaRepo.save(data)
      productDto.updated_at = new Date;
      productDto.updated_by = productDto.updated_by;
      var dataProduct = this.productRepo.create(productDto)
      let res = await this.productRepo.update(id, dataProduct);
      return helpers.success(res)

    } catch (err) {
      return helpers.error(err,"product.service")
    }

  }

  async delete(id: number) {
    try {
      let rs = await this.productRepo.update(id, { soft_delete: new Date });
      return helpers.success(rs)
    } catch (err) {
      return helpers.error(err,"product.service")
    }
  }

  async handleDataProductMeta(arrProductDto: [string, unknown][], id: number): Promise<CreateProductMetaDto[]> {
    const data = [];
    arrProductDto.map((key, val) => {
      var productDto = new ProductMeta
      productDto.product_id = id
      productDto.meta_key = key[0]
      productDto.meta_value = String(key[1])
      data.push(productDto)
    })
    return data
  }

  async handleDataProductMetaUpdate(arrProductDto: [string, unknown][], id: number): Promise<CreateProductMetaDto[]> {
    const data = [];
    var productMeta = await this.productMetaRepo.find({ where: { product_id: id } })
    arrProductDto.map((key, val) => {
      var productDto = new ProductMeta
      productDto.product_id = id
      productDto.meta_key = key[0]
      productDto.meta_value = String(key[1])
      productMeta.map((key, val) => {
        if (key.meta_key == productDto.meta_key) {
          productDto.id = key.id
        }
      })
      data.push(productDto)
    })
    return data
  }

}