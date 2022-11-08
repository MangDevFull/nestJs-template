import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable, OneToMany, UpdateDateColumn, CreateDateColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Store } from "../../stores/stores.entity";
import { Booking } from 'src/bookings/entities/bookings.entity';
import { Package } from 'src/package/package.entity';
import { Order } from 'src/orders/entities/orders.entity';
@Entity()
export class Customer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  full_name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: 2, nullable: true })
  gender: number;

  @Column({ default: 0, })
  isRecoverPassword: number;

  @Column({ nullable: true })
  code: string;

  @Column({ nullable: true })
  mobile: string;
  @BeforeInsert()
  @BeforeUpdate()
  removeSpacing() {
    if (this.mobile) {
      this.mobile = this.mobile.replace(/\s+/g, '');
    }
  }

  @Column({ nullable: true })
  birthday: string;

  @Column({ nullable: true })
  password: string;

  @Column({ nullable: true })
  day_birthday: number;

  @Column({ nullable: true })
  month_birthday: number;

  @Column({ nullable: true })
  year_birthday: number;

  @Column({ nullable: true })
  facebook_id: string;

  @Column({ nullable: true })
  ranking: number;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  district: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  avata_s3_name: string;

  @Column({ nullable: true })
  avata_name: string;

  @Column({ nullable: true })
  avata_url: string;

  @Column({ nullable: true })
  note: string;

  @Column({ nullable: true })
  last_visited: number;

  @Column({ nullable: true })
  loyalty_point: number;

  @Column({ nullable: true })
  zalo_account: string;

  @Column({ nullable: true })
  company: string;

  @Column({ nullable: true })
  job: string;

  @Column({ nullable: true })
  id_card: string;

  @Column({ nullable: true })
  referral_source: string;

  @Column({ nullable: true })
  contactId: string;

  @Column({ nullable: true })
  note_deposit: string;

  @Column({ nullable: true, default: 0 })
  deposit_money: number;

  @Column({ nullable: true, default: 0 })
  owe_money: number;

  @Column({ default: 1 })
  type: number;

  @CreateDateColumn({ type: "timestamp" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updated_at: Date;


  @Column({ nullable: true })
  created_by: number;

  @Column({ nullable: true })
  updated_by: number;

  @Column({ nullable: true })
  otp: string;

  @Column({ type: "timestamp", nullable: true })
  soft_delete: Date;

  @ManyToMany(() => Store)
  @JoinTable({
    name: 'store_customer',
    joinColumn: { name: 'customer_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'store_id' },
  })
  stores: Store[];

  @OneToMany(() => Booking, (booking) => booking.customers)
  booking: Booking[];

  @OneToMany(type => Package, packages => packages.customer)
  packages: Package[];

  @OneToMany(() => Order, (order) => order.customers)
  order?: Order[];
}