import { Entity, Column, PrimaryGeneratedColumn, OneToMany, JoinTable, CreateDateColumn,UpdateDateColumn, BeforeInsert} from 'typeorm';
import * as crypto from 'crypto';
import { Product } from './product.entity';
@Entity()
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({nullable: true})
  type: number;

  @Column({default: 1})
  created_by: number;

  @Column({default: 1})
  updated_by: number;
  
  @CreateDateColumn({ type: "timestamp"})
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp"})
  updated_at: Date;

  
  @Column({ type: "timestamp", nullable: true} )
  soft_delete: Date;

  @OneToMany(() => Product, (product) => product.category)
  product?: Product[];
}