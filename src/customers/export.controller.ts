import {Header, Controller, Get, Post, Put, Delete, Body, Param, Res, HttpStatus, Query, UseGuards, Request } from '@nestjs/common';
import { Store } from 'src/stores/stores.entity';
import { CustomersService } from './customers.service'
import { ExportService } from './export.service'
import { Customer } from './entities/customers.entity'
import { CustomerListParam } from './interfaces/customer.interfaces';
import { ExportListCustomerParam } from './interfaces/customer.interfaces';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { AuthenticationGuard } from 'src/auth/guards/auth.guard';
import * as helpers from '../helpers/response'


@Controller('export')
@UseGuards(AuthenticationGuard)
export class ExportController {
    constructor(
        private readonly exportService: ExportService
    ) { }

    @Get("customer")
    async exportCustomer( @Query() query:ExportListCustomerParam) {
        return await this.exportService.exportCustomer(query);
    }

}
