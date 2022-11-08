import { ProductMeta } from '../entities/product-meta.entity';
export class CreateProductDto {
    id: number;
    product_name: string;
    code: string;
    price: number;
    base_price: number;
    description: string;
    discount: string;
    type_discount: string;
    ranking: number;
    product_name_e: string;
    description_e: string;
    status: number;
    type: number;
    avata_url: string;
    avata_s3_name: string
    created_at: Date;
    updated_at: Date;
    created_by: number;
    updated_by: number;
    category_id: number;
    meta_object: {}
    meta:ProductMeta[];
  }
  