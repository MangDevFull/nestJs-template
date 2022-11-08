import { Injectable } from '@nestjs/common';
import { Note } from '../entities/notes.entity'
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import * as helper from '../../helpers/response';
import { plainToClass } from '@nestjs/class-transformer';
import { Order } from "../../orders/entities/orders.entity"
import { CreateNote } from "../dto/createNote"
import { Customer } from "src/customers/entities/customers.entity"
let _ = require('lodash');
@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(Note)
    private readonly noteRepo: Repository<Note>,

    @InjectRepository(Order)
    private readonly ordereRepo: Repository<Order>,

    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) { }

  async getListBookingByOrder(id: number) {
    try {
      const customer = await this.customerRepo.findOne({
        where: {
          id
        }
      })
      if (!customer) return helper.notFound("Không có khach hàng này")

      const orders = await this.ordereRepo.find({
        relations: {
          customers: true,
          note: true
        },
        where: {
          customers: {
            id: id,
          },
          soft_delete: IsNull()
        },
      })

      return helper.success(orders);
    } catch (error) {
      return helper.error(error,"note.service")
    }
  }
  async createNoteForOrder(CreateNote: CreateNote) {
    try {
      const {
        content,
        state,
        require,
        implement_plan,
        results,
        order_id,
      } = CreateNote

      const createOrder = this.ordereRepo.create({ id: order_id })

      const note = new Note();
      note.content = content
      note.state = state
      note.require = require
      note.implement_plan = implement_plan
      note.results = results
      note.order = createOrder
      const createNote = this.noteRepo.create(note)
      let newNote = await this.noteRepo.save(createNote)


      return helper.success(newNote);

    } catch (error) {
      return helper.error(error,"note.service")
    }
  }
  async updateNoteForOrder(note: any, id: number) {
    try {
      const {
        content,
        state,
        require,
        implement_plan,
        results,
      } = note
      const findNote = await this.noteRepo.findOne(
        {
          where: { id: id }
        })
      if (!findNote) return helper.notFound('Lịch này không tồn tại');

      findNote.content = content
      findNote.state = state
      findNote.require = require
      findNote.implement_plan = implement_plan
      findNote.results = results

      let editNote = await this.noteRepo.update(id, findNote);

      return helper.success({ editNote });
    } catch (error) {
      return helper.error(error,"note.service")
    }
  }
  async updateNoteForCustomer(id: number, body: any) {
    try {
      const {note} = body
      let checkUserExists = await this.customerRepo.findOne({ where: { id: id, soft_delete: IsNull() } });
      if (!checkUserExists) return helper.notFound('Khách hàng này không tồn tại');
      checkUserExists.note = note
      let editNote = await this.customerRepo.update(id, checkUserExists);
      return helper.success({ editNote });
    } catch (error) {
      return helper.error(error,"note.service")
    }
  }
  async findNote(id: number) {
    try {
      let note = await this.noteRepo.findOne({where: { id: id} });
      if (!note) return helper.notFound('Đơn hàng này không tồn tại');
      return helper.success({ note });
    } catch (error) {
      return helper.error(error,"note.service")
    }
  }
  async deleteNote(id: number) {
    try {
       const note = await this.noteRepo.findOne({where: { id: id}});
      if (!note) return helper.notFound('Đơn hàng này không tồn tại');
      let res = await this.noteRepo.remove(note)
      return helper.success(res);
    } catch (error) {
      return helper.error(error,"note.service")
    }
  }
}