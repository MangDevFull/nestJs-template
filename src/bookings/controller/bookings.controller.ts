import { Controller, Get, Post, Put, Delete, Body, Param, Res, UseGuards, ParseIntPipe, Query, Request } from '@nestjs/common';
import { BookingService } from '../service/bookings.service'
import { Booking } from '../entities/bookings.entity'
import { AuthenticationGuard } from '../../auth/guards/auth.guard';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { UpdateBookingDto } from '../dto/update-booking.dto';
import { ExportBookingListParam } from '../interfaces/export.interfaces';


@Controller('bookings')
@UseGuards(AuthenticationGuard)
export class BookingController {
    constructor(
        private readonly bookingsService: BookingService,
    ) { }

    @Get(':id_store')
    getAllBookings(@Param('id_store', ParseIntPipe) id_store: number, @Query() query) {
        return this.bookingsService.getListBooking(id_store, query)
    }

    @Post()
    createBooking(@Body() booking: CreateBookingDto, @Request() req) {
        return this.bookingsService.createBooking(booking, req.user);
    }

    @Post('/create/web')
    updateBookingFromWeb(@Body() booking: any, @Request() req) {
        return this.bookingsService.updateBookingFromWeb(booking, req.user);
    }

    @Put(':id')
    updateBooking(@Param('id', ParseIntPipe) id: number, @Body() booking: UpdateBookingDto, @Request() req) {
        return this.bookingsService.updateBooking(id, booking, req.user);
    }

    @Delete(':id')
    deleteBooking(@Param('id', ParseIntPipe) id: number) {
        return this.bookingsService.deleteBooking(id);
    }

    // @Put()
    // async update(@Body() booking: Booking, @Res() res) {
    //     const response = await this.bookingsService.update(booking);
    //     return res.status(HttpStatus.OK).json({
    //         status: HttpStatus.OK,
    //         message: 'success',
    //         data: response
    //     });
    // }

    // @Delete(':id')
    // async delete(@Param() params, @Res() res) {
    //     const response = await this.bookingsService.delete(params.id);
    //     return res.status(HttpStatus.OK).json({
    //         status: 'success',
    //         data: response
    //     });
    // }

    @Get('detail/:id')
    getDetailBooking(@Param('id', ParseIntPipe) id: number) {
        return this.bookingsService.getDetailBooking(id);
    }

    @Get('history/:storeId')
    getListBookingHistory(@Param('storeId', ParseIntPipe) id: number, @Query() query:ExportBookingListParam) {
        return this.bookingsService.getListBookingHistory(id, query);
    }
}
