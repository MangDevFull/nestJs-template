import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Brackets, IsNull, Repository } from 'typeorm';
import * as moment from 'moment';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();
import * as helper from '../helpers/response'
@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    // private userService: UsersService,

    // @InjectRepository(User)
    // private readonly usersRepository: Repository<User>,
  ) { }

  async authentication(email: string, password: string) {
    // const user = await this.userService.checkEmailLogin(email);

    // if (!user) return false;

    // const check = await bcrypt.compare(password, user.password);
    // if (!check) return false;

    return "user";
  }

  public getCookieForLogOut() {
    return `Authentication=; HttpOnly; Path=/; Max-Age=0`;
  }

  async login(user: any) {
    const payload = {
      name: user.name,
      email: user.email,
      id: user.id,
    };
    const expiresTime = process.env.EXPIRES_TIME;
    return {
      expiresIn: moment().add(expiresTime.slice(0, expiresTime.length - 1), 'days'),
      token: this.jwtService.sign(payload),
      user,
    };
  }
}
