import { Body, Controller, Delete, Post, Get, Param, Put, ParseIntPipe, UseGuards, Query, Res, Header, StreamableFile
} from '@nestjs/common';
import { ExportService } from './export.service';
import { AuthenticationGuard } from './../auth/guards/auth.guard';
import { PackageListParam } from './interface/package.interfaces';

import { createReadStream } from 'fs';
import { join } from 'path';
import { Response } from 'express';


@Controller('export')
@UseGuards(AuthenticationGuard)
export class ExportPackageController {
    constructor(
        private readonly exportService: ExportService
    ) { }

    @Get('package')
    @Header('Content-Type', 'application/json')
    async exportOrderList( @Query() query:PackageListParam) {
        return await this.exportService.exportPackage(query);
    }
}
