import { Controller, Get, Post, Put, Delete, Body, Param, Res, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { CreditService } from '../service/credit.service'
import { Credit } from '../entities/credit.entity'
import { AuthenticationGuard } from '../../auth/guards/auth.guard';
import { CreateCreditDto } from '../dto/create-credit.dto';
import { UpdateCreditDto } from '../dto/update-credit.dto';

@Controller('credit')
@UseGuards(AuthenticationGuard)
export class CreditController {
    constructor(
        private readonly creditService: CreditService,
    ) { }

    @Get(':id_customer')
    getListCredit(@Param('id_customer', ParseIntPipe) id_customer: number) {
        return this.creditService.getListCredit(id_customer)
    }

    @Post()
    createCredit(@Body() credit: CreateCreditDto) {
        return this.creditService.createCredit(credit);
    }
}
