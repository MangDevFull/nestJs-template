import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn,CreateDateColumn, OneToMany,UpdateDateColumn, BeforeInsert} from 'typeorm';
import { UseGuards} from '@nestjs/common';
import { Category } from "./category.entity";
import { ProductMeta} from "./product-meta.entity"
import * as crypto from 'crypto';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { AuthenticationGuard } from 'src/auth/guards/auth.guard';


@Entity()
@UseGuards(AuthenticationGuard)
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({nullable: true})
  product_name: string;

  @Column({nullable: true, unique: true})
  code: string;

  @Column({nullable: true})
  price: number;

  @Column({nullable: true})
  base_price: number;


  @Column({nullable: true})
  description: string;

  @Column({nullable: true})
  discount: string;

  @Column({nullable: true, default: "đ"})
  type_discount: string;

  @Column({nullable: true})
  ranking: number;

  @Column({nullable: true})
  product_name_e: string;

  @Column({nullable: true})
  description_e: string;

  @Column({nullable: true})
  status: number;

  @Column({nullable: true})
  type: number;

  @Column({nullable: true})
  avata_url: string;

  @Column({nullable: true})
  avata_s3_name: string;

  @Column({ type: "timestamp", nullable: true })
  soft_delete: Date;
  
  @CreateDateColumn({ type: "timestamp"})
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp"})
  updated_at: Date;

  @Column({default: 1})
  created_by: number;

  @Column({default: 1})
  updated_by: number;

  @Column({nullable: true})
  category_id: number;

  meta_object?: {}

  @ManyToOne(() => Category, (category) => category.id)
    @JoinColumn({ name: 'category_id' })
    category?: Category;

  @OneToMany(() => ProductMeta, (productMeta) => productMeta.Product)
    meta?: ProductMeta[];

}