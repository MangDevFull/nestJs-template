import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository } from 'typeorm';
import { User } from './users.entity';
import * as helper from '../helpers/response'
import { plainToClass } from '@nestjs/class-transformer';
import * as bcrypt from 'bcrypt';
import e from 'express';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

  ) {
  }
  async getUser(){
      return "haha"
  }
}