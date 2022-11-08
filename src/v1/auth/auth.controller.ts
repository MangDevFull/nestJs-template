import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthenticationGuard } from './guards/auth.guard';
import { LocalAuthGuard } from './guards/local.guard';
import * as helper from '../helpers/response'
@Controller('auth')
export class AuthController {
  constructor(
    // private userService: UsersService,
    private authService: AuthService,
    // private CustomersService: CustomersService,
  ) { }

  // @Post('/register')
  // async registerUser(@Body() input: CreateUserDto) {
  //   return await this.userService.createUser(input);
  // }

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(@Request() request) {
    return this.authService.login(request.user);
  }

  @Get('/test')
  async test() {
    return { oke: true }
  }

  @UseGuards(AuthenticationGuard)
  @Post('/logout')
  async getUserLogout(@Response() response): Promise<Response> {
    response.setHeader('Set-Cookie', this.authService.getCookieForLogOut());
    response.clearCookie('access_token');
    response.clearCookie('token');
    return response.sendStatus(200);
  }
}
