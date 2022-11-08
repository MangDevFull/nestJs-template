import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable, CreateDateColumn,UpdateDateColumn, BeforeInsert } from "typeorm";
import { Store } from "../stores/stores.entity";
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  mobile: string;

  @Column({ nullable: true })
  position: string;

  @Column({default: 1})
  status: number;

  @Column({default: 2})
  role: number;

  @BeforeInsert()
  emailToLowerCase() {
    this.email = this.email.toLowerCase();
  }
  
  @Column()
  password: string;

  @Column({ nullable: true })
  group: string;

  @Column({ nullable: true })
  avatar_name: string;

  @Column({ nullable: true })
  avatar_url: string;

  @Column({ nullable: true })
  avatar_s3_name: string;

  @Column({ nullable: true })
  created_by: number;

  @Column({ nullable: true })
  updated_by: number;

  @Column({ type: "timestamp", nullable: true })
  soft_delete: Date;
  
  @CreateDateColumn({ type: "timestamp"})
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp"})
  updated_at: Date;

  @ManyToMany(() => Store, store => store.users, {cascade: true, eager: true})
  @JoinTable({
    name: 'store_user',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'store_id' },
  })
  stores: Store[];
}
