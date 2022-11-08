import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateStoreDto } from './dto/create-stores.dto';
import { UpdateStoreDto } from './dto/update-stores.dto';
import { Store } from './stores.entity';
import { User } from 'src/users/users.entity';
import * as helper from '../helpers/response'

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private readonly storesRepository: Repository<Store>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getAllStores() {
    try {      
      let dataStore = await this.storesRepository.findBy({soft_delete: IsNull()});
      return helper.success(dataStore)
    } catch(error) {
      return helper.error(error,"store.service")
    }
  }

  async createStore(createStoreDto: CreateStoreDto) {
    try {
      const store = new Store();
      store.name_store = createStoreDto.name_store;
      store.description = createStoreDto.description;
      store.mobile = createStoreDto.mobile;
      store.address = createStoreDto.address;
      store.district = createStoreDto.district;
      store.city = createStoreDto.city;
      store.country = createStoreDto.country;
      store.google_map = createStoreDto.google_map;
      store.created_by = createStoreDto.created_by;
      
      let newStore = await this.storesRepository.save(store);
      return helper.success(newStore)
      
    } catch(error) {
      return helper.error(error,"store.service")
    }
  }

  async editStoreById(id: number, updateStoreDto: UpdateStoreDto) {
    try {
      let checkStoreExists = await this.storesRepository.findOneBy({id: id, soft_delete: IsNull()});
      let storeUpdate = {};

      if (!checkStoreExists) return helper.notFound('Cửa hàng không tồn tại');

      let updateStore = await this.storesRepository.update(id, updateStoreDto);

      if (updateStore.affected !== 0)
        storeUpdate = await this.storesRepository.findOneBy({id: id, soft_delete: IsNull()});

      return helper.success(storeUpdate);
    } catch(error) {
      return helper.error(error,"store.service")
    }
  }

  async softDeleteStoreById(id: number) {
    try {
      let checkStoreExists = await this.storesRepository.findOneBy({id: id, soft_delete: IsNull()});
      let storeUpdate = {};

      if (!checkStoreExists) return helper.notFound('Cửa hàng không tồn tại');
      
      let updateStore = await this.storesRepository.update(id, {soft_delete: new Date()});

      if (updateStore.affected !== 0)
        storeUpdate = await this.storesRepository.findOneBy({id: id});

      return helper.success(storeUpdate);
    } catch(error) {
      return helper.error(error,"store.service")
    }
  }

  async getStoreById(id: number) {
    try {
      let storeData = await this.storesRepository.findOneBy({id: id, soft_delete: IsNull()});

      return helper.success(storeData);
    } catch(error) {
      return helper.error(error,"store.service")
    }
  }

  async getUserByStore(id:number) {
    try {
      let data = await this.userRepository.find(
        {where: {
          stores: {
            id: id
          }, 
          soft_delete: IsNull(),
        },
        select: {
          id: true,
          name:true,
          avatar_url: true,
          role: true
        }
      });

      return helper.success(data);
    } catch(error) {
      return helper.error(error,"store.service")
    }
  }
  async getStoresByName(name:string){
    try {
      const data = await this.storesRepository.find({
        where:{
          city: name,
          soft_delete: IsNull(),
        }
      })
      return helper.success(data)
    } catch (error) {
      return helper.error(error)
    }
  }
}
