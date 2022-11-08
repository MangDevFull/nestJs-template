import {
    Controller,
    Get,
    Query,
    Body,
    Post,
    Put,
    UseGuards,
    Res
} from '@nestjs/common';
import { PublicService } from "./public.service"
import { WebHookCustomer } from "./webhook.service"
import { CreateCustomerWebHook } from "./create-custoner.webhook.dto"
import WebHookGuard from "./webhook.guard"
import { Response } from 'express';
@Controller('/public')
export class PublicController {
    constructor(private readonly PublicService: PublicService,
        private readonly WebHookCustomer: WebHookCustomer) { }
    @Get('/stores',)
    getStoresByName(@Query() query: any) {
        return this.PublicService.getStoresByName(query);
    }
    @Get('/stores/all',)
    findAllStore() {
        return this.PublicService.findAllStore();
    }
    @UseGuards(WebHookGuard())
    @Post('/webhook')
    async createCustomer(@Body() body: CreateCustomerWebHook,@Res() response: Response) {
        return await this.WebHookCustomer.createCustomer(body,response)
    }
    @UseGuards(WebHookGuard())
    @Put('/webhook')
    async updateCustomer(@Body() body: any,@Res() response: Response) {
        return await this.WebHookCustomer.updateCustomer(body,response)
    }
    @Post('/webhook/create')
    async updateCustomerForCaresoft(@Query() query: any) {
        return await this.WebHookCustomer.updateCustomerForCaresoft(query)
    }
    @Get('/webhook/we')
    async getContactIdForWe( @Res() response: Response,) {
        return await this.WebHookCustomer.getContactIdForWe(response)
    }
    @Post('/webhook/we')
    async updateContactIdForWe() {
        return await this.WebHookCustomer.updateContactIdForWe()
    }
    @Get('/categories/all',)
    getAllCategory() {
        return this.PublicService.getAllCategory();
    }
    @Get('/products',)
    getAllProduct() {
        return this.PublicService.getAllProduct();
    }
    @Get('/customer')
    checkCustomerIsExist(@Query() query: { id: string }) {
        let { id }: { id: string } = query
        const newId: number = parseInt(id)
        return this.PublicService.checkCustomerIsExist(newId);
    }
}