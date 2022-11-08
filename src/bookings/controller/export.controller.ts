import { Body, Controller, Delete, Post, Get, Param, Put, ParseIntPipe, UseGuards, Query, Res, Header, StreamableFile } from '@nestjs/common';
import {ExportBookingHistoryService} from '../service/export-booking-history.service';
import { AuthenticationGuard } from '../../auth/guards/auth.guard';
import { ExportBookingListParam } from '../interfaces/export.interfaces';


@Controller('export')
@UseGuards(AuthenticationGuard)
export class ExportBooking {
    constructor(
        private readonly exportBookingService: ExportBookingHistoryService,
    ) { }

    @Get('bookings')
    @Header('Content-Type', 'application/json')
    async exportCustomer(@Query() query:ExportBookingListParam) {
        return await this.exportBookingService.exportBooking(query);
    }
}
