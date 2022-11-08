import { OrdersModule } from './../orders/orders.module';
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, CreateDateColumn,UpdateDateColumn, OneToMany} from "typeorm";
import { User } from "../users/users.entity";
import { Booking } from "../bookings/entities/bookings.entity"
import { Customer } from "src/customers/entities/customers.entity";
import { Order } from "src/orders/entities/orders.entity";

@Entity()
export class Store {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name_store: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  mobile: string;
  
  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  district: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;  

  @Column({ nullable: true })
  google_map: string;

  @Column({ type: "timestamp", nullable: true} )
  soft_delete: Date;

  @Column({ nullable: true })
  created_by: number;

  @Column({ nullable: true })
  updated_by: number;

  @CreateDateColumn({ type: "timestamp"})
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp"})
  updated_at: Date;

  @ManyToMany(() => User, user => user.stores)
  users: User[];

  @OneToMany(() => Booking, (booking) => booking.stores)
  booking?: Booking[];

  @OneToMany(() => Order, (order) => order.stores)
  order?: Order[];

  @ManyToMany(() => Customer, customer => customer.stores)
  customer: Customer[];
}
