import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, Req ,Query, ParseIntPipe } from '@nestjs/common';
import { PackageService } from './package.service'
import { Package } from './package.entity'
import { AuthenticationGuard } from 'src/auth/guards/auth.guard'; 
import { FileInterceptor } from '@nestjs/platform-express';
import { PackageListParam } from './interface/package.interfaces';
import { CreatePackageDto } from './dto/create_package.dto';
import * as fs from "fs";
import { diskStorage } from 'multer'
import { extname } from 'path'

@Controller('package')
@UseGuards(AuthenticationGuard)
export class PackageController {
    constructor(private readonly packagesService: PackageService) {}
    
    @Get()
    async findAll(@Query() query:PackageListParam) {
        return await this.packagesService.findAll(query,['product', 'customer'])
    }
  
    @Get(':id')
    async get(@Param() params) {
        return await this.packagesService.findOne(params.id);
    }
  
    @Get('customer/:id')
    async getPackageByCustomer(@Param() params) {
        return await this.packagesService.findByCustomer(params.id);
    }

    @Post()
    async create(@Body() packageDto: CreatePackageDto, @Request() req) {
        return await this.packagesService.createPackage(packageDto, req.user.id);
    }
  
    @Put(':id')
    async update(@Param() params, @Body() packages: Package, @Request() req) {
        return await this.packagesService.update(params.id, packages, req.user.id);
    }
  
    @Delete(':id')
    async delete(@Param() params) {
        return await this.packagesService.delete(params.id);
    }

    @Post('status/:id')
    async changeSatus(@Request() req,@Param() params) {
        return await this.packagesService.changeStatus(req,params.id);
    }

    @Get('history-item/:code')
    async getItemHistory(@Param() params) {
        return await this.packagesService.getItemHistory(params.code);
    }

    @Get('convert-credit/:id_store')
    async convertPackageToCredit(@Param('id_store', ParseIntPipe) id_store: number, @Query() query) {
        return await this.packagesService.convertPackageToCredit(id_store, query)
    }
}
