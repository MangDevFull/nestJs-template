import { Controller, Get, Post, Put, Delete, Body, Param, Res, UploadedFile, UseGuards, Request,Req ,UseInterceptors } from '@nestjs/common';
import { CategoryService } from '../services/category.service'
import { Category } from '../entities/category.entity'
import { AuthenticationGuard } from 'src/auth/guards/auth.guard'; 
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from "fs";
import { diskStorage } from 'multer'
import { extname } from 'path'

@Controller('category')
@UseGuards(AuthenticationGuard)
export class CategoryController {
    constructor(private readonly categorysService: CategoryService) {}
    
    @Get()
    async findAll() {
        return await this.categorysService.findAll(['product'])
    }
  
    @Get(':id')
    async get(@Param() params) {
        return await this.categorysService.findOne(params.id);
    }
  
    @Get('group/:id')
    async getAllGroupByType(@Param() params) {
        return await this.categorysService.getAllGroupByType(params.id);
    }

    @Post("/")
    async create(@Body() category: Category, @Request() req) {
        return await this.categorysService.create(category, req.user.id);
    }
  
    @Put(':id')
    async update(@Param() params, @Body() category: Category, @Request() req) {
        return await this.categorysService.update(params.id, category, req.user.id);
    }
  
    @Delete(':id')
    async delete(@Param() params) {
        return await this.categorysService.delete(params.id);
    }

    @Get('product/:id')
    async GetProductBuyCategory(@Param() params) {
        return await this.categorysService.GetProductBuyCategory(params.id);
    }

}
