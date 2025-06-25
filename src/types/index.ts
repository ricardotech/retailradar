export interface Product {
  id: string;
  name: string;
  brand: string;
  colorway: string;
  retailPrice: number;
  currentPrice: number;
  discountPercentage: number;
  size?: string;
  sku?: string;
  imageUrl?: string;
  stockxUrl: string;
  lastUpdated: Date;
}

export interface Price {
  id: string;
  productId: string;
  price: number;
  size?: string;
  timestamp: Date;
  source: DataSource;
}

export enum DataSource {
  OFFICIAL_API = 'official_api',
  RAPIDAPI = 'rapidapi',
  PUPPETEER = 'puppeteer',
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    cursor?: string;
    hasNext: boolean;
    total?: number;
  };
}

export interface BrandProductsQuery {
  minDiscount?: number;
  maxPrice?: number;
  size?: string;
  cursor?: string;
  limit?: number;
}

export type SupremeProductsQuery = BrandProductsQuery;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}