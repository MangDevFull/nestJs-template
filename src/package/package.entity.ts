import { Entity, Column, PrimaryGeneratedColumn, JoinColumn,OneToMany, ManyToOne, CreateDateColumn,UpdateDateColumn, OneToOne} from 'typeorm';
import * as crypto from 'crypto';
import { Product } from 'src/products/entities/product.entity';
import { Customer } from 'src/customers/entities/customers.entity';
import { Store } from 'src/stores/stores.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';


@Entity()
export class Package {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({nullable: true})
  type: string;

  @Column({ type: "timestamp", nullable: true})
  expiration_date: Date;

  @Column({nullable: true})
  count_used: number;
  
  @Column({nullable: true, unique:true})
  package_code: string;

  @Column({nullable: true})
  note: string;

  @Column({nullable: true})
  status: number;

  @Column({nullable: true})
  customer_mobile: string;

  @Column({nullable: true})
  max_used: number

  @Column({ type: "timestamp", nullable: true})
  last_used: Date

  @Column({ type: "timestamp", nullable: true})
  date_of_issue: Date

  @Column({ nullable: true})
  product_name: string

  @Column({ nullable: true})
  customer_name: string

  @Column({ nullable: true})
  order_code: string

  @Column({default: 1})
  created_by: number;

  @Column({default: 1})
  updated_by: number;

  @Column({ nullable: true})
  customer_id: number

  @Column({ nullable: true})
  product_id: number

  @Column({nullable: true})
  order_id: number


  @Column({nullable: true})
  store_id: number

  @Column({nullable: true})
  price_of_card: number

  @Column({nullable: true})
  initial_amount: number

  @Column({nullable: true})
  sale_card:number

  @Column({nullable:true})
  note_package:string
  
  @CreateDateColumn({ type: "timestamp"})
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp"})
  updated_at: Date;

  @Column({ type: "timestamp", nullable: true} )
  soft_delete: Date;

  @ManyToOne(() => Customer, (customer) => customer.packages)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => Product, (product) => product.id)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Store, (store) => store.id)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.package)
  orderItems?: OrderItem[];

}