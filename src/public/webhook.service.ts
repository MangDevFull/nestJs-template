import { Injectable, HttpStatus } from '@nestjs/common';
import { Customer } from '../customers/entities/customers.entity'
import { Store } from "../stores/stores.entity"
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { CreateCustomerWebHook } from "./create-custoner.webhook.dto"
import * as helper from '../helpers/response'
import { plainToClass } from '@nestjs/class-transformer';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Response } from 'express'
const fs = require('fs');
import {
  paginate,
} from 'nestjs-typeorm-paginate';
@Injectable()
export class WebHookCustomer {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectQueue('webhook') private queue: Queue,
    @InjectQueue('webhook-we') private queueWe: Queue
  ) { }
  async createCustomer(body: CreateCustomerWebHook, res: Response) {
    try {
      const { object, user, action } = body
      console.log("body webhook caresoft", body)
      if (object != "user" || action != "create") {
        return res.status(HttpStatus.BAD_REQUEST).json(helper.notFound("Không đúng chức năng"))
      }
      const customer = await this.customerRepo.findOne({ where: { mobile: user.phone_no } })

      if (customer) return res.status(HttpStatus.NOT_FOUND).json(helper.notFound("Khách hàng đã tồn tại"))

      const createCustomer = await this.customerRepo.create({
        mobile: user.phone_no,
        full_name: user.username,
        contactId: user.id.toString()
      })
      await this.customerRepo.save(createCustomer)
      return res.status(HttpStatus.OK).json({ oke: true })
    } catch (error) {
      console.error(error)
      return res.status(HttpStatus.BAD_GATEWAY).json(helper.error(error,"webhook"))
    }
  }
  async updateCustomer(body: any, res: Response) {
    try {
      const { user, object, action } = body
      console.log("update webhook body", body)
      if (object != "user" || action != "update") {
        return res.status(400).json(helper.notFound("Không đúng chức năng"))
      }
      const customer = await this.customerRepo.findOne({ where: { contactId: user.id } })

      if (!customer) return res.status(404).json(helper.notFound("Khách hàng đã tồn tại"))

      if (user.phone_no && user.phone_no != "") {
        const isExitsPhone = await this.customerRepo.findOne({ where: { mobile: user.phone_no } })
        if (isExitsPhone) return res.status(404).json(helper.notFound("Số điện thoại đã tồn tại"))
      }

      if (user.username) {
        customer.full_name = user.username
      }
      if (user.phone_no) {
        customer.mobile = user.phone_no
      }
      if (user.email) {
        customer.email = user.email
      }
      if (user.gender) {
        customer.gender = parseInt(user.gender) + 1
      }
      await this.customerRepo.save(plainToClass(Customer, customer));
      return res.status(200).json({ oke: true })

    } catch (error) {
      console.error(error)
      return res.status(500).json(helper.error(error,"webhook"))
    }
  }
  async updateCustomerForCaresoft(query) {
    try {
      const { page, limit } = query
      const options = {
        limit: parseInt(limit),
        page: parseInt(page)
      }
      const res = await paginate(this.customerRepo, options, {
        where: {
          mobile: Not(""),
          contactId: IsNull()
        },
      });

      for (let i = 100; i < res.items.length; i++) {
        this.queue.add({ data: res.items[i] });
      }
      return helper.success(res.meta)

    } catch (error) {
      console.error(error)
      return helper.error(error)
    }
  }
  async getContactIdForWe(res: Response) {
    try {
      const data = await this.customerRepo.createQueryBuilder('customer')
        .select("customer.mobile", "mobile")
        .addSelect("customer.contactId", "contactId")
        .addSelect("customer.id", "id")
        .addSelect("COUNT(customer.mobile)", "count")
        .where("customer.contactId IS NOT NULL")
        .andWhere(`customer.mobile != ""`)
        .groupBy('customer.mobile')
        .having("COUNT(customer.mobile) = :id", { id: 1 })
        .getRawMany()
      return res.status(200).json(data.length)
    } catch (error) {
      console.error(error)
      return helper.error(error)
    }
  }
  async updateContactIdForWe() {
    try {
      fs.readFile('./res.json', 'utf8', (error, data) => {
        if (error) {
          console.log(error);
          return helper.error(error);
        }
        const parseData = JSON.parse(data)
        console.log("parse", parseData)
        for (let i = 0; i < parseData.length; i++) {
          this.queueWe.add({ data: parseData[i] })
        }
        return helper.success({ success: true });
      })

    } catch (error) {
      console.error(error)
      return helper.error(error)
    }
  }

}
