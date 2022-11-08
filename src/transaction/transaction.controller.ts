import { Controller, Get, Post, Put, Delete, Body, Param, Res, UploadedFile, UseGuards, Request,Req ,UseInterceptors } from '@nestjs/common';
import { TransactionService } from './transaction.service'
import { Transaction } from './transaction.entity'
import { AuthenticationGuard } from 'src/auth/guards/auth.guard'; 
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from "fs";
import { diskStorage } from 'multer'
import { extname } from 'path'
import { CreateTransactionDto } from './dto/create-transaction.dto';


@Controller('transaction')
@UseGuards(AuthenticationGuard)
export class TransactionController {
    constructor(private readonly transactionsService: TransactionService) {}
    
    @Get()
    async findAll() {
        return await this.transactionsService.findAll(['product'])
    }
  
    @Get(':id')
    async get(@Param() params) {
        return await this.transactionsService.findOne(params.id);
    }
  
    @Post("/")
    async create(@Body() transactionDto: CreateTransactionDto, @Request() req) {
        return await this.transactionsService.create(transactionDto, req.user.id);
    }
  
    @Put(':id')
    async update(@Param() params, @Body() transaction: Transaction, @Request() req) {
        return await this.transactionsService.update(params.id, transaction, req.user.id);
    }
  
    @Put('delete/:id')
    async delete(@Param() params, @Body() customer: any) {
        return await this.transactionsService.delete(params.id, customer);
    }

    @Get('customer/:id')
    async getTransactionCustomer(@Param() params) {
        return await this.transactionsService.getTransactionCustomer(params.id);
    }

    @Get('order/:id')
    async getTransactionOrder(@Param() params) {
        return await this.transactionsService.getTransactionOrder(params.id);
    }

}
