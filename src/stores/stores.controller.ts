import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CreateStoreDto } from './dto/create-stores.dto';
import { UpdateStoreDto } from './dto/update-stores.dto';

import { StoresService } from './stores.service';
import { AuthenticationGuard } from '../auth/guards/auth.guard';

@Controller('stores')
@UseGuards(AuthenticationGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {} 

  @Get()
  getAllStores() {
    return this.storesService.getAllStores();
  }

  @Post()
  createStore(@Body() createStoreDto: CreateStoreDto) {
    return this.storesService.createStore(createStoreDto);
  }

  @Put(':id',)
  editStoreById(@Param('id', ParseIntPipe) id: number, @Body() updateStoreDto: UpdateStoreDto) {
    return this.storesService.editStoreById(id, updateStoreDto);
  }

  

  @Delete(':id')
  softDeleteStoreById(@Param('id', ParseIntPipe) id: number) {
    return this.storesService.softDeleteStoreById(id);
  }

  @Get(':id')
  getStoreById(@Param('id', ParseIntPipe) id: number) {
    return this.storesService.getStoreById(id);
  }

  @Get('users/:id')
  getUserByStore(@Param('id', ParseIntPipe) id: number) {
    return this.storesService.getUserByStore(id);
  }

  @Get('/stores/:name',)
  getStoresByName(@Param('name') name: string) {
    return this.storesService.getStoresByName(name);
  }
}