import { Injectable } from '@nestjs/common';
import { Credit } from '../entities/credit.entity'
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import * as helper from '../../helpers/response';
import { Store } from '../../stores/stores.entity'
import { Customer } from '../../customers/entities/customers.entity';
import { Package } from '../../package/package.entity';
import { CreateCreditDto } from '../dto/create-credit.dto';
import { UpdateCreditDto } from '../dto/update-credit.dto';
import { plainToClass } from '@nestjs/class-transformer';
let _ = require('lodash');
@Injectable()
export class CreditService {
  constructor(
    @InjectRepository(Credit)
    private readonly creditRepo: Repository<Credit>,

    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,

    @InjectRepository(Package)
    private readonly packageRepo: Repository<Package>,
  ) { }

  async getListCredit(id_customer: number) {
    try {
      let dataCredit = await this.creditRepo.createQueryBuilder('credit_history')
      .where('credit_history.customer_id = :id', { id: id_customer })
      .leftJoinAndMapMany("credit_history.customer", Customer, 'customer', 'credit_history.customer_id = customer.id')
      .leftJoinAndMapMany("credit_history.receiver", Customer, 'receiver', 'credit_history.receiver_id = receiver.id')
      .orderBy('credit_history.created_at', 'DESC')
      .getMany();
      
      return helper.success(dataCredit);
    } catch (error) {
      console.log(error)
      return helper.error(error,"credit.service")
    }
  }

  async createCredit(createCreditDto: CreateCreditDto) {
    try {
      let customerCredit = await this.customerRepo.createQueryBuilder('customer')
      .where('customer.id = :id', { id: createCreditDto.customer_id })
      .getOne();

      let customerCreditHistory = new Credit();

      customerCreditHistory.customer_id = createCreditDto.customer_id
      customerCreditHistory.old_price = customerCredit.deposit_money
      customerCreditHistory.change_price = Number(createCreditDto.change_price)
      customerCreditHistory.note = createCreditDto.note
      customerCreditHistory.reason = createCreditDto.reason
      customerCreditHistory.store_id = createCreditDto.store_id
      customerCreditHistory. store_name = createCreditDto.store_name
      customerCreditHistory.created_by = createCreditDto.created_by
      customerCreditHistory.created_by_name = createCreditDto.created_by_name
      customerCreditHistory.receiver_id = createCreditDto.receiver_id;
      
      let packageByCustomer;
      if (createCreditDto.package_code) {
        packageByCustomer = await this.packageRepo.createQueryBuilder('package')
        .where('package.package_code = :package_code', { package_code: createCreditDto.package_code })
        .getOne();
        if (!packageByCustomer) return helper.notFound('Thẻ này không tồn tại hoặc đã bị khóa')
        customerCreditHistory.package_code = createCreditDto.package_code;


      }

      if (!createCreditDto.receiver_id) {
        customerCredit.deposit_money = Number(customerCredit.deposit_money) + Number(createCreditDto.change_price);
      } else {
        if (customerCredit.deposit_money < Number(createCreditDto.change_price)) return helper.error("Số tiền còn lại trong tài khoản không đủ để chuyển", "credit.service");
        customerCredit.deposit_money = Number(customerCredit.deposit_money) - Number(createCreditDto.change_price);

        let receiverCredit = await this.customerRepo.createQueryBuilder('customer')
        .where('customer.id = :id', { id: createCreditDto.receiver_id })
        .getOne();

        //save history credit of receiver customer
        let receiverCreditHistory = new Credit();

        receiverCreditHistory.customer_id = receiverCredit.id
        receiverCreditHistory.old_price = receiverCredit.deposit_money
        receiverCreditHistory.new_price = Number(receiverCredit.deposit_money) + Number(createCreditDto.change_price)
        receiverCreditHistory.change_price = Number(createCreditDto.change_price)
        receiverCreditHistory.note = "Nhận cọc từ khách hàng " + customerCredit.full_name + " - " + customerCredit.mobile
        receiverCreditHistory.reason = "Nhận cọc"
        receiverCreditHistory.store_id = createCreditDto.store_id
        receiverCreditHistory. store_name = createCreditDto.store_name
        receiverCreditHistory.created_by = createCreditDto.created_by
        receiverCreditHistory.created_by_name = createCreditDto.created_by_name

        await this.creditRepo.save(receiverCreditHistory);

        //save deposit_money of receiver customer
        receiverCredit.deposit_money = Number(receiverCredit.deposit_money) + Number(createCreditDto.change_price)
        await this.customerRepo.save(plainToClass(Customer, receiverCredit));
      }

      customerCreditHistory.new_price = customerCredit.deposit_money

      await this.customerRepo.save(plainToClass(Customer, customerCredit));
      await this.creditRepo.save(customerCreditHistory);
      if (packageByCustomer) await this.packageRepo.update(packageByCustomer.id, { status: 2 })

      return helper.success('Thành công')
    } catch (error) {
      console.log(error)
      return helper.error(error,"credit.service")
    }
  }
}