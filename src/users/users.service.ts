import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './users.entity';
import { Store } from '../stores/stores.entity';
import * as helper from '../helpers/response'
import { plainToClass } from '@nestjs/class-transformer';
import * as bcrypt from 'bcrypt';
import e from 'express';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,

  ) {
  }

  async getAllUser(params) {
    try {
      var query = this.usersRepository.createQueryBuilder('user')
        .where('user.soft_delete IS NULL')
        .leftJoinAndSelect("user.stores", "stores")
        .andWhere('user.role = :role', { role: 2 })

      if (params.keyword && typeof params.keyword != 'undefined') {
        query = query.andWhere(new Brackets(qb => {
          qb.where("user.name like :name", { name: `%${params.keyword}%` })
            .orWhere("user.email like :email", { email: `%${params.keyword}%` })
            .orWhere("user.mobile like :mobile", { mobile: `%${params.keyword}%` })
        }))
      }
      var dataUser = await query.getMany()

      return helper.success(dataUser)
    } catch (error) {
      return helper.error(error, "users.services")
    }
  }

  async createUser(createUserDto: CreateUserDto) {
    try {
      let checkEmailExists = await this.usersRepository.findOneBy({ email: createUserDto.email });

      if (checkEmailExists) return helper.notFound('Email này đã được đăng ký');

      const user = new User();

      if (!createUserDto.password) createUserDto.password = 'Cent2022';
      user.name = createUserDto.name;
      user.email = createUserDto.email;
      user.mobile = createUserDto.mobile;
      user.position = createUserDto.position;
      user.status = createUserDto.status;
      user.role = createUserDto.role;
      user.group = createUserDto.group;
      user.avatar_name = createUserDto.avatar_name;
      user.avatar_url = createUserDto.avatar_url;
      user.avatar_s3_name = createUserDto.avatar_s3_name;
      user.avatar_name = createUserDto.avatar_name;
      user.created_by = createUserDto.created_by;
      user.password = await this.hashPassword(createUserDto.password);


      if (createUserDto.stores) {
        const storeId = (createUserDto.stores).map((item) =>
          this.storesRepository.create({ id: item })
        );

        user.stores = storeId;
      }

      let userData = this.usersRepository.create(user);
      let newUser = await this.usersRepository.save(userData);

      newUser = await this.usersRepository.createQueryBuilder('user')
        .where('user.soft_delete IS NULL')
        .leftJoinAndSelect("user.stores", "stores")
        .andWhere('user.role = :role', { role: 2 })
        .andWhere('user.id = :id', { id: newUser.id })
        .getOne();

      return helper.success(newUser)
    } catch (error) {
      return helper.error(error, "users.services")
    }
  }

  async editUserById(id: number, updateUserDto: UpdateUserDto) {
    try {
      let checkUserExists = await this.usersRepository.findOne({ where: { id: id, soft_delete: IsNull() }, relations: ["stores"] });
      let storeId = [];

      if (!checkUserExists) return helper.notFound('Nhân viên này không tồn tại');
      if (updateUserDto.stores) {
        storeId = (updateUserDto.stores).map((item) =>
          this.storesRepository.create({ id: item })
        );
      }

      if (updateUserDto.password) {
        updateUserDto.password = await this.hashPassword(updateUserDto.password);
      }

      let dataUpdate = {
        ...checkUserExists,
        ...updateUserDto,
        stores: storeId
      };

      await this.usersRepository.save(plainToClass(User, dataUpdate));

      let updateUser = await this.usersRepository.createQueryBuilder('user')
        .where('user.soft_delete IS NULL')
        .leftJoinAndSelect("user.stores", "stores")
        .andWhere('user.role = :role', { role: 2 })
        .andWhere('user.id = :id', { id: id })
        .getOne();

      return helper.success(updateUser);
    } catch (error) {
      return helper.error(error, "users.services")
    }
  }

  async getUserById(id: number) {
    try {
      let dataUser = await this.usersRepository.findOne({ where: { id: id, soft_delete: IsNull() }, relations: ["stores"] });
      return helper.success(dataUser)
    } catch (error) {
      return helper.error(error, "users.services")
    }
  }

  async getUserByStore(id: number) {
    try {
      let dataUser = await this.usersRepository.createQueryBuilder('user')
        .where('user.soft_delete IS NULL')
        .andWhere('user.role = :role', { role: 2 })
        .andWhere(
          new Brackets((qb) => {
            qb.where('store.id = :id', { id: id })
          }),
        )
        .leftJoinAndSelect("user.stores", "store")
        .orderBy('user.name', 'ASC')
        .getMany();
      return helper.success(dataUser)
    } catch (error) {
      console.log(error)
      return helper.error(error, "users.services")
    }
  }

  async softDeleteUserById(id: number) {
    try {
      let checkUserExists = await this.usersRepository.findOne({ where: { id: id, soft_delete: IsNull() } });
      let userHasUpdate = {};

      if (!checkUserExists) return helper.notFound('Nhân viên này không tồn tại');

      let updateUser = await this.usersRepository.update(id, { soft_delete: new Date() });
      if (updateUser.affected !== 0)
        userHasUpdate = await this.usersRepository.findOne({ where: { id: id }, relations: ["stores"] });

      return helper.success(userHasUpdate);
    } catch (error) {
      return helper.error(error, "users.services")
    }
  }

  async checkEmailLogin(email: string) {
    return this.usersRepository.findOneBy({ email: email });
  }


  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    let passwordHash = await bcrypt.hash(password, salt);
    return passwordHash;
  }
  
  async getInforUser(email: string) {
    try {
      const data = await this.usersRepository.findOne({
        where: {
          email
        }
      })
      return data
    } catch (error) {
      console.error(error)
      return helper.error(error)
    }
  }
}