import { Controller, Get, Post, Put, Delete, Body, Param, Res, HttpStatus , Query, UseGuards, Request} from '@nestjs/common';
import { Store } from 'src/stores/stores.entity';
import { ImportService } from './import.service'
import { AuthenticationGuard } from 'src/auth/guards/auth.guard'; 

@Controller('import')
@UseGuards(AuthenticationGuard)
export class ImportController {
    constructor(private readonly importService: ImportService) {}


    @Post('customer')
    async importCustomer() {
        const response = await this.importService.importCustomer()
        return response
    }

    @Post('category')
    async importCategorySv() {
        const response = await this.importService.importCategorySv()
        return response
    }

    @Post('product-sv')
    async importProductcSv() {
        const response = await this.importService.importProductSv()
        return response
    }

    @Post('product-card')
    async importProudtcCard() {
        const response = await this.importService.importProudtcCard()
        return response
    }

    @Post('product')
    async importProudct() {
        const response = await this.importService.importProudct()
        return response
    }

    @Post('user')
    async importUser() {
        const response = await this.importService.importUser()
        return response
    }

    @Post('customer-used-card')
    async importCustomerUsedCard(@Query() type: string) {
        const response = await this.importService.importCustomerUsedCard(type)
        return response
    }

    @Post('order')
    async importOrder(@Query() type: string) {
        const response = await this.importService.importOrder(type)
        return response
    }

    @Post('store')
    async importStore(@Query() type: string) {
        const response = await this.importService.importStore(type)
        return response
    }

    @Post('transaction')
    async importTransaction(@Query() type: string) {
        const response = await this.importService.importTransaction(type)
        return response
    }

    @Post('update-id-order-item')
    async updateOrderItem(@Query() type: string) {
        const response = await this.importService.updateOrderItem()
        return response
    }

    @Post('add-trasaction-by-order')
    async addTrasaction(@Query() type: string) {
        const response = await this.importService.addTrasaction()
        return response
    }


    @Post('update-new-package-order-item')
    async updateNewPackageOrderItem(@Query() type: string) {
        const response = await this.importService.updateNewPackageOrderItem()
        return response
    }

}
