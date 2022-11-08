import { Process, Processor } from "@nestjs/bull";
import { Job } from "bull";
import { plainToClass } from '@nestjs/class-transformer';
import { Customer } from 'src/customers/entities/customers.entity'
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LooseObject } from "../../interfaces/looseObject.interface"

const axios = require('axios').default;
let count = 0
@Processor('webhook')
export class MessageConsumer {
    constructor(
        @InjectRepository(Customer)
        private readonly customerRepo: Repository<Customer>,
    ) { }
    @Process()
    async readOperationJob(job: Job<any>) {
        try {
            console.log("id", job.data.data);
            let payload: LooseObject = {
                "username": job.data.data.full_name,
                "gender": job.data.data.gender - 1,
                "phone_no": job.data.data.mobile,
            }
            if (job.data.data.email && job.data.data.email != "") {
                payload = {
                    ...payload,
                    "email": job.data.data.email,
                }
            }
            axios({
                method: 'post',
                url: `${process.env.CARESOFT_URL}/contacts`,
                headers: {
                    'Authorization': `Bearer ${process.env.CARESOFT_TOKEN}`
                },
                data: {
                    "contact": { ...payload }
                }
            }).then(async rs => {
                const { data } = rs
                const payload = {
                    ...job.data.data,
                    contactId: data?.contact?.id.toString()
                }
                await this.customerRepo.save(plainToClass(Customer, payload))
                console.log("done")
                count++
                console.log("done is " + count)

            }).catch(err => {
                console.log(err)
                console.log("fail")
                console.log("done is " + count)
            })

        } catch (error) {
            console.error(error)
            console.log("fail")
            console.log("done is " + count)

        }

    }
}