import { Module } from '@nestjs/common';
import { CategoryController } from './controller/category.controller';
import { CategoryService } from './services/category.service';
import { ProductController } from './controller/product.controller';
import { ProductService } from './services/product.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import {ProductMeta} from './entities/product-meta.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Category, Product, ProductMeta])],
  controllers: [CategoryController,ProductController],
  providers: [CategoryService,ProductService]
})
export class ProductsModule {}
