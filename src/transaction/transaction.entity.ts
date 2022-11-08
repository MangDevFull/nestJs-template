import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn,UpdateDateColumn, BeforeInsert} from 'typeorm';
import { Store } from 'src/stores/stores.entity';
import { Customer } from 'src/customers/entities/customers.entity';
import { User } from 'src/users/users.entity';
import { Order } from '../orders/entities/orders.entity';


@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({nullable: true})
  paid_amount: number;

  @Column({nullable: true})
  total_amount: number;

  @Column({nullable: true})
  remain_amount: number;

  @Column({nullable: true, unique: true})
  transaction_code: string;

  @Column({nullable: true})
  pay_type: string;


  @Column({nullable: true})
  store_id: number;

  @Column({nullable: true, default: 1})
  status: number;

  @Column({default: 1})
  created_by: number;

  @Column({default: 1})
  updated_by: number;

  @Column({nullable: true})
  pay_account_number: string
  
  @CreateDateColumn({ type: "timestamp"})
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp"})
  updated_at: Date;
  
  @Column({ type: "timestamp", nullable: true} )
  soft_delete: Date;

  @ManyToOne(() => Order, (order) => order.transaction)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Store, (store) => store.id)
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  user: User;

  // @ManyToOne(() => User, (User) => User.id)
  // @JoinColumn({ name: 'created_by' })
  // User?: User;
}