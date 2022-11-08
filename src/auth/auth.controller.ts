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
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { AuthenticationGuard } from './guards/auth.guard';
import { LocalAuthGuard } from './guards/local.guard';
import { CustomersService } from "../customers/customers.service"
import * as helper from '../helpers/response'
@Controller()
export class AuthController {
  constructor(
    private userService: UsersService,
    private authService: AuthService,
    private CustomersService: CustomersService,
  ) { }

  @Post('/register')
  async registerUser(@Body() input: CreateUserDto) {
    return await this.userService.createUser(input);
  }

  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(@Request() request) {
    return this.authService.login(request.user);
  }

  @Post('/login-phone')
  async checkPhone(@Body() body: { phone: string }) {
    const { phone } = body
    return this.CustomersService.checkPhone(phone)
  }
  @Get('/get-infor')
  async getInforUser(@Query() query: { email: string }) {
    const { email } = query
    const data = await this.userService.getInforUser(email)
    if (data) {
      const token = await this.authService.login(data)
      return helper.success(token)
    }

    return helper.notFound(data)

  }
  @Post('/recover-password')
  async recoverPassword(@Body() body: { phone: string }) {
    const { phone } = body
    return this.CustomersService.recoverPassword(phone)
  }
  @Post('/save-password')
  async saveRecoverPassword(@Body() body: { phone: string, password: string }) {
    const { phone, password } = body
    return this.CustomersService.saveRecoverPassword(phone, password)
  }
  @Post('/save-password-v2')
  async saveRecoverPassword2(@Body() body: { phone: string, password: string }) {
    const { phone, password } = body
    return this.CustomersService.saveRecoverPassword2(phone, password)
  }
  @Post('/check-otp')
  async checkOtp(@Body() body: { phone: string, otp: string }) {
    const { phone, otp } = body
    return this.CustomersService.checkOtp(phone, otp)
  }
  @Post('/create-password')
  async savePassword(@Body() body: { phone: string, password: string }) {
    const { phone, password } = body
    const data = await this.CustomersService.savePassword(phone, password)
    if (data.code === 200) {
      return this.authService.loginPassword(data.data)
    } else {
      return data
    }
  }
  @Post('/check-password')
  async loginPassword(@Body() body: { phone: string, otp: string }) {
    const { phone, otp } = body
    const customer = await this.CustomersService.login(phone, otp)
    if (customer) {
      return this.authService.loginPassword(customer)
    } else {
      return helper.notFound("Mật khẩu không hợp lệ")
    }
  }

  @Post('/check-password-to-reset')
  async checkPassword(@Body() body: { username: string, password: string }) {
    return await this.authService.checkPassword(body)
  }

  @Post('/change-password')
  async changePassword(@Body() body: { id: string, password: string }) {
    return await this.authService.changePassword(body)
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
