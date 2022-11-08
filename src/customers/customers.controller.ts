import { Controller, Get, Post, Put, Delete, Body, Param, Res, HttpStatus, Query, UseGuards, Request } from '@nestjs/common';
import { CustomersService } from './customers.service'
import { Customer } from './entities/customers.entity'
import { CustomerListParam } from './interfaces/customer.interfaces';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { AuthenticationGuard } from 'src/auth/guards/auth.guard';
import * as helpers from '../helpers/response'
@Controller('customer')
@UseGuards(AuthenticationGuard)
export class CustomersController {
    constructor(
        private readonly customersService: CustomersService,
    ) { }

    @Get()
    async findAll(@Query() query: CustomerListParam) {
        const response = await this.customersService.findAll(query, ['stores'])
        return response
    }
    @Get('/order')
    async getOrderByCustomer(@Query() query: any, @Request() req) {
        return await this.customersService.getOrderByCustomer(query, req)
    }
    @Get('/packages')
    async getPackagesByCustomer(@Query() query: any, @Request() req) {
        return await this.customersService.getPackagesByCustomer(query, req)
    }
    @Get('/packages/booking')
    async getPackagesCustomer(@Request() req) {
        return await this.customersService.getPackagesCustomer(req)
    }
    @Get(':id')
    async get(@Param() params) {
        const response = await this.customersService.findOne(params.id, ['stores']);
        return response;
    }

    @Post("/")
    async create(@Body() customer: Customer, @Body() customerDto: CreateCustomerDto, @Request() req) {
        const { mobile } = customer

        const isValidPhone = await this.customersService.checkPhoneCustomer(mobile)
        if (isValidPhone) {
            const response = await this.customersService.create(customer, customerDto, req.user.id);
            return response
        } else {
            return helpers.notFound("Số điện thoại đã tồn tại")
        }
    }
    @Get('/infor/account')
    async getInfor(@Request() req) {
        return await this.customersService.getInfor(req)
    }
    @Get('/contacts/check-phone')
    async checkPhoneInCrm(@Query() query: { phone: string }) {
        const { phone } = query
        return await this.customersService.checkPhoneInCrm(phone)
    }
    @Put('/')
    async updateInfor(@Body() body: any, @Request() req) {
        return await this.customersService.updateInfor(body, req)
    }


    @Put(':id')
    async update(@Param() params, @Body() customerDto: CreateCustomerDto, @Request() req) {
        const response = await this.customersService.update(params.id, customerDto, req.user.id);
        return response
    }

    @Delete(':id')
    async delete(@Param() params) {
        const response = await this.customersService.delete(params.id);
        return response
    }
    @Get('order/:id')
    async getDataOrderBuyId(@Param() params) {
        const response = await this.customersService.getDataOrderBuyId(params.id);
        return response
    }

    @Get('order-item/:id')
    async getDataOrderItem(@Param() params) {
        const response = await this.customersService.getDataOrderItem(params.id);
        return response
    }
    @Get('features-item/:id')
    async getFeaturesItem(@Param() params) {
        const response = await this.customersService.getFeaturesItem(params.id);
        return response
    }

}
