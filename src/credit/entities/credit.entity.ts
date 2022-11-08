import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne, OneToMany, UpdateDateColumn, CreateDateColumn, BeforeInsert } from 'typeorm';
import { Store } from '../../stores/stores.entity'
import { Customer } from 'src/customers/entities/customers.entity';
import { generateRandomString } from '../../helpers/const';

@Entity('credit_history')
export class Credit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  customer_id: number;

  @Column({ nullable: true })
  old_price: number;

  @Column({ nullable: true })
  new_price: number;

  @Column({ nullable: true })
  change_price: number;

  @Column({ nullable: true })
  note: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  order_code: string;

  @Column({ nullable: true })
  receiver_id: number;
  
  @Column({ nullable: true })
  store_id: number;

  @Column({ nullable: true })
  store_name: string;

  @Column({ nullable: true })
  package_code: string;

  @Column({ nullable: true })
  created_by: number;

  @Column({ nullable: true })
  created_by_name: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;
}
