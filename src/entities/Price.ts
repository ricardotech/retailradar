import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './Product';
import { DataSource } from '@/types';

@Entity('prices')
export class Price {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  size?: string;

  @Column({
    type: 'enum',
    enum: DataSource,
    default: DataSource.RAPIDAPI,
  })
  source!: DataSource;

  @CreateDateColumn({ name: 'created_at' })
  timestamp!: Date;

  @ManyToOne(() => Product, (product) => product.prices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}