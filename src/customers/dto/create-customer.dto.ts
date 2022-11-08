export class CreateCustomerDto {
  code: string;
  full_name: string;
  email: string;
  gender: number;
  mobile: string;
  birthday: string;
  facebook_id: string;
  ranking: number;
  city: string;
  address: string;
  district: string;
  country: number;
  month_birthday: number;
  day_birthday: number;
  year_birthday:number;
  avata_s3_name: string;
  avata_name: string;
  avata_url: string;
  note: string;
  loyalty_point: number;
  zalo_account: string;
  company: string;
  job: string;
  id_card: string;
  referral_source: string;
  created_at: Date;
  updated_at: Date;
  created_by: number;
  updated_by: number;
  stores: number[];
  cso
}