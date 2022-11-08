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
    Request
  } from '@nestjs/common';
  import { OrdersService } from '../services/orders.service';
  import { AuthenticationGuard } from '../../auth/guards/auth.guard';
  import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';

  @Controller()
  @UseGuards(AuthenticationGuard)
  export class OrdersController {
    constructor(
      private readonly ordersService: OrdersService,
      ) {}
  
    @Get('/orders/:id_store')
    getAllUser(@Param('id_store', ParseIntPipe) id_store: number) {
      return this.ordersService.getAllOrders(id_store);
    }

    @Get('/order-detail')
    getOrderByCode(@Query() query) {
      return this.ordersService.getOrderByCode(query);
    }

    @Post("orders")
    createOrder(@Body() createOrderDto: CreateOrderDto, @Request() req) {
      return this.ordersService.createOrder(createOrderDto, req.user);
    }
    @Put('/orders/:id')
    updateOrder(@Param('id', ParseIntPipe) id: number, @Body() updateOrderDto: UpdateOrderDto, @Request() req) {
      return this.ordersService.updateOrder(id, updateOrderDto, req.user);
    }

    @Post('/save-orders/:id')
    saveOrder(@Param('id', ParseIntPipe) id: number, @Body() updateOrderDto: UpdateOrderDto, @Request() req) {
      return this.ordersService.saveOrder(id, updateOrderDto, req.user.id);
    }
  
    // @Get(':id')
    // getUserById(@Param('id', ParseIntPipe) id: number) {
    //   return this.usersService.getUserById(id);
    // }
  
    // @Get('/store/:id')
    // getUserByStore(@Param('id', ParseIntPipe) id: number) {
    //   return this.usersService.getUserByStore(id);
    // }
  
    // @Delete(':id')
    // softDeleteUserById(@Param('id') id: number) {
    //   return this.usersService.softDeleteUserById(id);
    // }

    @Get('/dashboard/:id_store')
    dataDashboard(@Param('id_store', ParseIntPipe) id_store: number) {
      return this.ordersService.dataDashboard(id_store);
    }

    @Get('/cronOweMoney/:id_store')
    syncOweMoneyCustomer(@Param('id_store', ParseIntPipe) id_store: number) {
      return this.ordersService.syncOweMoneyCustomer(id_store);
    }
  }
  