import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  ParseIntPipe,
  UseGuards,
  Query
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthenticationGuard } from '../auth/guards/auth.guard';
@Controller('users')
@UseGuards(AuthenticationGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    ) {}

  @Get()
  getAllUser(@Query() keyword: string) {
    return this.usersService.getAllUser(keyword);
  }

  @Put(':id')
  editUserById(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.editUserById(id, updateUserDto);
  }

  @Get(':id')
  getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserById(id);
  }

  @Get('/store/:id')
  getUserByStore(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserByStore(id);
  }

  @Delete(':id')
  softDeleteUserById(@Param('id') id: number) {
    return this.usersService.softDeleteUserById(id);
  }
}
