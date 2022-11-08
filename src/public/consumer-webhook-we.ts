import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { plainToClass } from '@nestjs/class-transformer';
import { Customer } from 'src/customers/entities/customers.entity'
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
@Processor('webhook-we')
export class MessageConsumerWe {
    constructor(
        @InjectRepository(Customer)
        private readonly customerRepo: Repository<Customer>,
    ) { }
    @Process()
    async readOperationJob(job: Job<any>) {
        try {
            delete job.data.data.count
            const customer = await this.customerRepo.findOne({
                where: {
                    id: job.data.data.id
                }
            })
            const payload = {
                ...customer,
                ...job.data.data,
            }
            const update = await this.customerRepo.save(plainToClass(Customer, payload))
            console.log(update)
            console.log("done")
        } catch (error) {
            console.error(error)
        }

    }
}