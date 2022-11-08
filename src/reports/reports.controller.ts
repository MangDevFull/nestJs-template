import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    Put,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from '../auth/guards/auth.guard';
import { ReportsService } from "./reports.service"
import { QueryReport } from './interfaces/query.interface';
@Controller('reports')
@UseGuards(AuthenticationGuard)
export class ReportController {
    constructor(private readonly ReportsService: ReportsService) { }
    @Get('/daily')
    async CountDaily(@Query() query: QueryReport) {
        return await this.ReportsService.CountDaily(query)
    }
    @Get('/locations')
    async CountLocation(@Query() query: QueryReport) {
        return await this.ReportsService.CountLocation(query)
    }
    @Get('/customers')
    async CountCustomers(@Query() query: QueryReport) {
        return await this.ReportsService.CountCustomers(query)
    }
    @Get('/users')
    async countUser(@Query() query: QueryReport) {
        return await this.ReportsService.countUser(query)
    }
    @Get('/receipt')
    async countReceipt(@Query() query: QueryReport) {
        return await this.ReportsService.countReceipt(query)
    }
    @Get('/products')
    async countProduct(@Query() query: QueryReport) {
        return await this.ReportsService.countProduct(query)
    }
    @Get('/products/table')
    async tableProduct(@Query() query: QueryReport) {
        return await this.ReportsService.tableProduct(query)
    }
    @Get('store/users/:id')
    async getUsersByStore(@Param('id', ParseIntPipe) id:number) {
        return await this.ReportsService.getUsersByStore(id)
    }
    @Get('/orders/customer/:id')
    async getOrdersByCustomer(@Param('id', ParseIntPipe) id:number, @Query() query: any) {
        return await this.ReportsService.getOrdersByCustomer(id,query)
    }
    
}