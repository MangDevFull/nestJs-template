import { Injectable } from '@nestjs/common';
import { Transaction } from './transaction.entity' 
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull , Not} from 'typeorm';
import { UpdateResult, DeleteResult } from  'typeorm';
import * as helpers from '../helpers/response'
import { Order } from 'src/orders/entities/orders.entity';
import { Customer } from 'src/customers/entities/customers.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { Store } from 'src/stores/stores.entity';
import {plainToClass} from '@nestjs/class-transformer';
import { error } from 'console';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async findAll ( relations: string[] = [],) {
    try {
      let res =  await this.transactionRepo.find({where: {soft_delete : IsNull()}, relations});
      return helpers.success(res)
    } catch (err) {
      return helpers.error(err,"transaction.service")
    }
  }

  async findOne (id: number) {
    try {
      let res  =  await this.transactionRepo.findOne({where: {id: id, soft_delete : IsNull()}})
      return helpers.success(res)
    } catch (error) {
      return helpers.error(error,"transaction.service") 
    }
  }


  async create (transactionDto: CreateTransactionDto, userId: number) {
    try {
      var store = this.storeRepo.create({id: transactionDto.store_id})
      let order = await this.orderRepo.save(plainToClass(Order, {id: transactionDto.order_id}));

      transactionDto.status = 2
      transactionDto.created_by =  userId;
      transactionDto.updated_by =  userId;
      let transaction = this.transactionRepo.create({
        ...transactionDto,
        order
      })
      
      let res =  await this.transactionRepo.save(transaction)
      var transactionCode = "GD" + await this.addLeadingZeros(res.id, 6)
      // update status order
      var data = await this.checkTransactionDone(transactionDto.order_id)
      await this.transactionRepo.update(res.id, {transaction_code: transactionCode, remain_amount:data[0] ,total_amount: data[1]})

      // Update owe money customer
      if (transactionDto.paid_amount > 0) {
        let customer = await this.customerRepo.createQueryBuilder('customer')
          .select('customer.owe_money')
          .where('customer.id = :id', { id: transactionDto.customer_id })
          .getOne();

        let owe_money = Number(customer.owe_money)
        owe_money -= transactionDto.paid_amount;

        await this.customerRepo.update(transactionDto.customer_id, {owe_money: owe_money})
      }

      return helpers.success(res)
    } catch (err) {
        return helpers.error(err,"transaction.service")
    }
  }

  async checkTransactionDone (orderId) {
    var order = await this.orderRepo.findOne({where: {id: orderId}});
    var totalOwed = await this.transactionRepo.createQueryBuilder("transaction")
    .select("SUM(transaction.paid_amount)", "sum")
    .where("transaction.order_id = :id", { id:orderId })
    .andWhere("transaction.soft_delete IS NULL")
    .getRawOne();
    var totalOwedNew = totalOwed["sum"]
    var moneyOwed = order.total_price - totalOwedNew
    if (moneyOwed < 0) {
      moneyOwed = 0;
    }
    await this.orderRepo.update(orderId, {money_owed: moneyOwed})
    return [moneyOwed, order.total_price]
   
  }

  async update(id: number, transaction: Transaction, userId) {
    try {
      transaction.updated_by = userId
      transaction.updated_at = new Date
      let res =  await this.transactionRepo.update(id, transaction);
      return helpers.success(res)
    } catch (err) {
      return helpers.error(err,"transaction.service")
    }
  }

  async delete(id: number, customer: any){
    try {
      var transaction = await this.transactionRepo.findOne({
        where: {id: id, soft_delete : IsNull()},
        relations: {
          order: true
        }
      })
      let res =  await this.transactionRepo.update(id, {soft_delete: new Date});
      await this.checkTransactionDone(transaction.order.id)

    // Update owe money customer
    let dataCustomer = await this.customerRepo.createQueryBuilder('customer')
      .select('customer.owe_money')
      .where('customer.id = :id', { id: customer.customer_id })
      .getOne();

    if (transaction.paid_amount > 0) {
      let owe_money = dataCustomer.owe_money;
      owe_money += transaction.paid_amount;

      await this.customerRepo.update(customer.customer_id, {owe_money: owe_money})
    }
      return helpers.success(res)
    } catch (err) {
      console.log(err)
      return helpers.error(err,"transaction.service")
    }
  }

  async getTransactionCustomer(id: number){
    try {
        let res =  await this.orderRepo.find({
          where: {
            transaction:{ soft_delete: IsNull() },
            customers:{ id:id },
            orderItem: { price: Not(0) },
            soft_delete: IsNull(),
            money_owed: Not(0)
          },
          relations:{
            stores:true,
            transaction: { user:true, store:true, },
            orderItem:{  product:true },
            User: true
          },
          select:{
            User:{ id: true, name:true },
            stores:{ id:true, name_store: true },
            orderItem:{ 
              id:true, 
              product: { id: true, product_name: true }
            },
            transaction:{
              id: true,paid_amount: true, transaction_code: true,pay_type: true,created_at: true, store_id: true, status: true, pay_account_number: true,
              user: { id: true, name:true }
            }
          },
          order: { id: "DESC", }
        });

        let lastOrder = await this.orderRepo.createQueryBuilder("order")
        .select(['order_at'])
        .where('soft_delete IS NULL')
        .andWhere('status = 3')
        .andWhere('customer_id = :id', {id: id})
        .orderBy('order_at', 'DESC')
        .getRawOne();

        var totalOwedOrder = 0
        res.map((val,key) => {
          var total = 0;
          var totalPrice = val.total_price
          totalOwedOrder += val.money_owed
          val.transaction.map((item, keyTr) => {
            total += item.paid_amount
            val.transaction[keyTr]["old_owed"] = totalPrice -  item.paid_amount
            totalPrice = totalPrice -  item.paid_amount 
          })
          res[key]["total_paid_amount"] = total
        })

        var data =  {
          "data" : res,
          totalOwedOrder: totalOwedOrder,
          lastOrder: lastOrder ? lastOrder.order_at : ''
        }

        return helpers.success(data)
    } catch (err) {
      // return helpers.error(error,"transaction.service")
    }
  }

  async addLeadingZeros(num, totalLength) {
    return String(num).padStart(totalLength, '0');
  }

  async getTransactionOrder(id: number) {
    try {
      var res = await this.transactionRepo.find({
        where: {
          order:{
            id: id,
          },
          soft_delete: IsNull()
        },
        relations:{
          user: true,
        },
        select: {
          user:{
            id: true,
            name: true
          }
        }
      })
      return helpers.success(res)
    } catch (error) {
      return helpers.error(error,"transaction.service")
    }

  }
}