import { Product } from '@/types';

export interface IStockXAdapter {
  getBrandProducts(brandName: string): Promise<Product[]>;
  isHealthy(): Promise<boolean>;
}