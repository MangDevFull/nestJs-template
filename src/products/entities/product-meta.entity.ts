import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn,UpdateDateColumn, BeforeInsert} from 'typeorm';
import * as crypto from 'crypto';
import { Product } from './product.entity';
@Entity()
export class ProductMeta {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({nullable: true})
  meta_key: string;

  @Column({nullable: true})
  meta_value: string;

  @Column({nullable: true})
  product_id: number;

  @ManyToOne(() => Product, (product) => product.id)
     @JoinColumn({ name: 'product_id' })
     Product?: Product;

}