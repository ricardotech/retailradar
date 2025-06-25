import { Product } from '@/types';

export interface IStockXAdapter {
  getSupremeProducts(): Promise<Product[]>;
  isHealthy(): Promise<boolean>;
}