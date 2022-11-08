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
import { AuthenticationGuard } from '../auth/guards/auth.guard';
@Controller('users')
// @UseGuards(AuthenticationGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    ) {}

    @Get('')
    getAllUser() {
      return this.usersService.getUser();
    }
}
