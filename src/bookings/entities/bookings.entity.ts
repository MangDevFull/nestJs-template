import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne, OneToMany, UpdateDateColumn, CreateDateColumn, BeforeInsert } from 'typeorm';
import { Store } from '../../stores/stores.entity'
import { Customer } from 'src/customers/entities/customers.entity';
import { generateRandomString } from '../../helpers/const';

@Entity()
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  book_code: string;
  @BeforeInsert()
  insertCode() {
    this.book_code = generateRandomString(13);
  }

  @Column({ nullable: true })
  status: number; // trạng thái đặt lịch trước, đặt trực tiếp, pre order

  @Column({ nullable: true })
  book_status: number; // trạng thái đã xác nhận, chờ phục vụ, hoàn thành...

  @Column({ type: "datetime" })
  book_date: Date | string; // đặt lịch hẹn vào ngày

  @Column("json")
  booking_item: {
    'product_ids': { 'id': string; 'name': string }[];
    'user_ids': { 'id': number; 'name': string }[];
    'intend_time': number
  }[]

  @ManyToOne(() => Store, (store) => store.booking)
  @JoinColumn({ name: 'store_id' })
  stores: Store;

  @ManyToOne(() => Customer, (customer) => customer.booking)
  @JoinColumn({ name: 'customer_id' })
  customers: Customer;

  @Column("text", { nullable: true })
  description: string;

  @Column({ nullable: true })
  intend_time: number; // thời gian dự kiến làm dịch vụ

  @Column({ nullable: true })
  source_from: number; // Đặt lịch từ (facbook, zalo …)

  @Column({ default: 1 })
  order_status: number;

  @Column({ nullable: true })
  ticketId: string;

  @Column({ nullable: true })
  soft_delete: Date;

  @Column({ nullable: true })
  created_by: number;

  @Column({ nullable: true })
  updated_by: number;

  @Column({ nullable: false, default: 0 })
  isCareSoft: number;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at: Date;
}
