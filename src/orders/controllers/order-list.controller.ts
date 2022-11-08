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
} from '@nestjs/common';
import { OrderListService } from '../services/order-list.service';
import { ExportService } from '../services/export.service';
import { AuthenticationGuard } from '../../auth/guards/auth.guard';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrderListParam } from 'src/orders/interface/order.interfaces';


@Controller('order-list')
@UseGuards(AuthenticationGuard)
export class OrdersListController {
    constructor(
        private readonly ordersService: OrderListService,
        private readonly exportService: ExportService
    ) { }

    @Get(':id_store')
    getAllUser(@Query() query:OrderListParam, @Param('id_store', ParseIntPipe) id_store: number) {
        return this.ordersService.getAllOrders(query, id_store);
    }

    @Get('order-item/:order_id')
    getOrderItemByOrder( @Param('order_id', ParseIntPipe) id: number) {
        return this.ordersService.getOrderItemByOrder(id);
    }

    @Put('change-status/:order_id')
    changeStatusOrder( @Param('order_id', ParseIntPipe) id: number,   @Body() updateOrder: UpdateOrderDto) {
        return this.ordersService.changeStatusOrder(id, updateOrder);
    }

    @Get('export-order-list')
    exportOrderList( @Query() query:OrderListParam, @Param('id_store', ParseIntPipe) id_store: number) {
        return  this.exportService.exportOrderList(query, id_store);
    }


}
