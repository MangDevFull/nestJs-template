export class CreateStoreDto {
  name_store: string;
  description: string;
  mobile: string;
  address: string;
  district: string;
  city: string;
  country: string;
  google_map: string;
  soft_delete: Date;
  created_by: number;
}
