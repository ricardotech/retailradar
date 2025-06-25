import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Price } from './Price';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  brand!: string;

  @Column({ type: 'varchar', length: 255 })
  colorway!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'retail_price' })
  retailPrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'current_price' })
  currentPrice!: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 4,
    name: 'discount_percentage',
  })
  discountPercentage!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  size?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku?: string;

  @Column({ type: 'text', nullable: true, name: 'image_url' })
  imageUrl?: string;

  @Column({ type: 'text', name: 'stockx_url' })
  stockxUrl!: string;

  @OneToMany(() => Price, (price) => price.product)
  prices!: Price[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}