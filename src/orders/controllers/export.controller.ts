import {
    Body,
    Controller,
    Delete,
    Post,
    Get,
    Param,
    Put,
    ParseIntPipe,
    UseGuards,
    Query,
    Res,
    Header, StreamableFile
} from '@nestjs/common';
import { ExportService } from '../services/export.service';
import { AuthenticationGuard } from '../../auth/guards/auth.guard';
import { OrderListParam } from 'src/orders/interface/order.interfaces';
import { createReadStream } from 'fs';
import { join } from 'path';
import { Response } from 'express';


@Controller('export')
@UseGuards(AuthenticationGuard)
export class ExportOrdersController {
    constructor(
        private readonly exportService: ExportService
    ) { }

    @Get('order-list/:id_store')
    @Header('Content-Type', 'application/json')
    async exportOrderList( @Query() query:OrderListParam, @Param('id_store', ParseIntPipe) id_store: number) {
        return await this.exportService.exportOrderList(query, id_store);
    }
}
