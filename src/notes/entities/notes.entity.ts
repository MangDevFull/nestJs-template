import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne, OneToMany, UpdateDateColumn, CreateDateColumn, BeforeInsert } from 'typeorm';
import { Order } from 'src/orders/entities/orders.entity';
@Entity()
export class Note {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Order, (order) => order.note)
  @JoinColumn({ name: 'order_id' })
  order: Order;
  
  @Column({ nullable: true })
  content: string;
  @Column({ nullable: true })
  state: string;
  @Column({ nullable: true })
  require: string;
  @Column({ nullable: true })
  implement_plan: string;
  @Column({ nullable: true })
  results: string;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at: Date;
}
