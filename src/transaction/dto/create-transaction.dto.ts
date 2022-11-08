export class CreateTransactionDto {
    paid_amount: number;
    total_amount: number;
    remain_amount: number;
    transaction_code: string;
    pay_type: string;
    store_id: number;
    order_id: number;
    created_at: Date;
    created_by: number;
    updated_by: number;
    status: number;
    customer_id: any;
}
  