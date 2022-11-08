export interface ICustomer {
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
    avata_s3_name: string;
    avata_name: string;
    avata_url: string;
    note: string;
    last_visited: number;
    loyalty_point: number;
    zalo_account: string;
    company: string;
    job: string;
    id_card: string;
    referral_source: string;
    created_at: number;
    updated_at: number;
    created_by: number;
    updated_by: number;
  }
  
  export interface CustomerListParam {
    day: number | null;
    month: number | null;
    keyword: string | null;
    take: number | null;
    page: number | null;
  }
  

  export interface ExportListCustomerParam {
    startOrderAt: string | null;
    endOrderAt: string | null;
    startCustomer: string | null;
    endCustomer: string | null;
    keyword: string | null;
    ranking: number | null;
  }