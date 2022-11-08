export class CreatePackageDto {
  type: string;
  expiration_date: Date;
  count_used: number;
  note: string;
  status: number;
  customer_mobile: string;
  max_used: number
  last_used: Date
  date_of_issue: Date
  product_name: string
  customer_name: string
  order_code: string
  created_by: number;
  updated_by: number;
  customer_id: number
  product_id: number
  order_id: number
  store_id: number
  price_of_card: number
  initial_amount: number
  sale_card: number
  soft_delete: Date
  quantity: number
  year: number
  month: number
  day: number
}