import { Controller, Get, Post, Put, Delete, Body, Param, Res, HttpStatus , Query, Request, UseGuards} from '@nestjs/common';
import { ProductService } from '../services/product.service'
import { Product } from '../entities/product.entity'
import { CreateProductDto } from '../dto/create-product.dto';
import { ProductListParam } from '../interfaces/product.interfaces';
import { AuthenticationGuard } from 'src/auth/guards/auth.guard'; 

@Controller('product')
@UseGuards(AuthenticationGuard)
export class ProductController {
    constructor(private readonly productsService: ProductService) {}
    
    @Get()
    async findAll(@Query() query: ProductListParam) {
        return await this.productsService.findAll(query,['category', 'meta'])
    }
  
    @Get(':id')
    async get(@Param() params) {
        return await this.productsService.findOne(params.id, ['category', 'meta']);
    }
  
    @Post("/")
    async create(@Body() product: Product,@Body() productDto: CreateProductDto,@Request() req) {
       return await this.productsService.create(product, productDto, req.user.id);
    }
  
    @Put(':id')
    async update(@Param() param,@Body() productDto: CreateProductDto, @Request() req) {
        return await this.productsService.update(param.id, productDto, req.user.id);
    }
  
    @Delete(':id')
    async delete(@Param() params) {
        return await this.productsService.delete(params.id);
        
    }
}
