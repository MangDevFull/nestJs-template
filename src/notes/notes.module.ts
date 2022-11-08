import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from './entities/notes.entity';
import { NoteService } from './service/notes.service';
import {Order} from "../orders/entities/orders.entity"
import {NoteController} from "./controller/notes.controller"
import {Customer} from "src/customers/entities/customers.entity"
@Module({
  imports: [TypeOrmModule.forFeature([Note,Order,Customer])],
  controllers: [NoteController],
  providers: [NoteService]
})
export class NoteModule {}
