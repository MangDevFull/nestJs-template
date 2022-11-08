import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { Order } from './orders.entity';
import { Product } from 'src/products/entities/product.entity';
import { User } from 'src/users/users.entity';
import { Package } from 'src/package/package.entity';


@Entity()
export class OrderItem {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ default: 1 })
    quantity: number;

    @Column({ nullable: true })
    price: number;

    @Column({ nullable: true })
    package_code: string;

    @Column({ nullable: true })
    new_package: boolean;

    @Column({ nullable: true })
    product_code: string;

    @Column({ nullable: true })
    product_name: string;

    @Column({ nullable: true })
    discount: number;

    @Column({ nullable: true })
    total_price_after_discount: number;

    @Column({ nullable: true })
    amount_deducted_from_membership_card: number;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'product_id' })
    product: Product;

    @Column({ nullable: true })
    product_id: number;

    @ManyToOne(() => Order, (order) => order.id)
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @Column({ nullable: true })
    order_id: number;

    @Column({ nullable: true })
    presenter_user_id: number;

    @Column({ nullable: true })
    presenter_customer_id: number;

    @Column({ nullable: true })
    type_presenter: number;

    // hoa hồng người giới thiệu
    @Column({ nullable: true })
    commission_presenter: number;

    @Column({nullable:true})
    presenter_name:string

    @Column({nullable:true})
    note_package:string
    
    @Column({nullable:true})
    presenter_mobile:string

    @Column({nullable:true})
    max_used_package:number
    //employee_service: id nhân viên phục vụ 
    //employee_service_name: tên nhân viên phục vụ 
    //sommission_service: hoa hồng phục vụ

    //employee_consultant: id nhân viên tư vấn
    //employee_consultant_name: tên nhân viên tư vấn
    //sommission_consultant: hoa hồng tư vấn
    
    // NHÂN VIÊN PHỤC VỤ VÀ HOÁ HỒNG
    // @ManyToOne(() => User, (user) => user.id)
    // @JoinColumn({ name: 'employee_service1' })
    // employee_service1?: Order
    @Column({nullable:true})
    last_used_count:number
    @Column({ nullable: true })
    employee_service1: number;

    @Column({ nullable: true })
    sommission_service1: number;

    // @ManyToOne(() => User, (user) => user.id)
    // @JoinColumn({ name: 'employee_service2' })
    // employee_service2?: Order;
    @Column({ nullable: true })
    employee_service2: number;
    @Column({ nullable: true })
    sommission_service2: number;

    // @ManyToOne(() => User, (user) => user.id)
    // @JoinColumn({ name: 'employee_service3' })
    // employee_service3?: Order;
    @Column({ nullable: true })
    employee_service3: number;
    @Column({ nullable: true })
    sommission_service3: number;

    // @ManyToOne(() => User, (user) => user.id)
    // @JoinColumn({ name: 'employee_service4' })
    // employee_service4?: Order;
    @Column({ nullable: true })
    employee_service4: number;
    @Column({ nullable: true })
    sommission_service4: number;

    // @ManyToOne(() => User, (user) => user.id)
    // @JoinColumn({ name: 'employee_service5' })
    // employee_service5?: Order;
    @Column({ nullable: true })
    employee_service5: number;
    @Column({ nullable: true })
    sommission_service5: number;

    // Tên nhân viên phục vụ
    @Column({ nullable: true })
    employee_service_name1: string;

    @Column({ nullable: true })
    employee_service_name2: string;
    @Column({ nullable: true })

    employee_service_name3: string;
    @Column({ nullable: true })

    employee_service_name4: string;

    @Column({ nullable: true })
    employee_service_name5: string;


    // Nhân viên tư vấn và hoa hồng
    // @ManyToOne(() => User, (user) => user.id)
    // @JoinColumn({ name: 'employee_consultant1' })
    // employee_consultant1?: Order;
    @Column({ nullable: true })
    employee_consultant1: number;
    @Column({ nullable: true })
    sommission_consultant1: number;

    // @ManyToOne(() => User, (user) => user.id)
    // @JoinColumn({ name: 'employee_consultant2' })
    // employee_consultant2?: Order;
    @Column({ nullable: true })
    employee_consultant2: number;
    @Column({ nullable: true })
    sommission_consultant2: number;

    // @ManyToOne(() => User, (user) => user.id)
    // @JoinColumn({ name: 'employee_consultant3' })
    // employee_consultant3?: Order;
    @Column({ nullable: true })
    employee_consultant3: number;
    @Column({ nullable: true })
    sommission_consultant3: number;

    // @ManyToOne(() => User, (user) => user.id)
    // @JoinColumn({ name: 'employee_consultant4' })
    // employee_consultant4?: Order;
    @Column({ nullable: true })
    employee_consultant4: number;
    @Column({ nullable: true })
    sommission_consultant4: number;


    // @ManyToOne(() => User, (user) => user.id)
    // @JoinColumn({ name: 'employee_consultant5' })
    // employee_consultant5?: Order;
    @Column({ nullable: true })
    employee_consultant5: number;
    @Column({ nullable: true })
    sommission_consultant5: number;

    // Tên nhân viên tư vấn
    @Column({ nullable: true })
    employee_consultant_name1: string;

    @Column({ nullable: true })
    employee_consultant_name2: string;

    @Column({ nullable: true })
    employee_consultant_name3: string;

    @Column({ nullable: true })
    employee_consultant_name4: string;

    @Column({ nullable: true })
    employee_consultant_name5: string;

    @Column({ nullable: true })
    note: string;

    @ManyToOne(() => Package, (packa) => packa.orderItems)
    @JoinColumn({ name: 'package_id' })
    package: Package;
}