import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Store } from './stores.entity';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { User } from 'src/users/users.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Store, User])],
  providers: [StoresService],
  controllers: [StoresController],
})
export class StoresModule {}
