import axios, { AxiosInstance } from 'axios';
import { IStockXAdapter } from './IStockXAdapter';
import { Product } from '@/types';
import { logger } from '@/config/logger';
import { ExternalApiError } from '@/middleware/error-handler';

interface RapidApiProduct {
  id: string;
  title: string;
  brand: string;
  colorway: string;
  retail_price: number;
  market?: {
    last_sale?: number;
    lowest_ask?: number;
  };
  image?: {
    small?: string;
  };
  urlKey: string;
}

export class RapidApiAdapter implements IStockXAdapter {
  private client: AxiosInstance;
  private readonly baseUrl = 'https://stockx1.p.rapidapi.com';

  constructor(private readonly apiKey: string) {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': 'stockx1.p.rapidapi.com',
      },
      timeout: 10000,
    });
  }

  async getBrandProducts(brandName: string): Promise<Product[]> {
    try {
      logger.info(`Fetching ${brandName} products from RapidAPI`);

      const response: { data: { data: { products: RapidApiProduct[]; }; }; } = await this.client.get('/search', {
        params: {
          query: brandName.toLowerCase(),
          category: 'shoes',
          limit: 100,
        },
      });

      const products = response.data?.data?.products || [];
      const brandProducts = this.transformProducts(products, brandName);

      const belowRetailProducts = brandProducts.filter(
        (product) => product.currentPrice < product.retailPrice
      );

      logger.info(
        `Found ${belowRetailProducts.length} ${brandName} products below retail from RapidAPI`
      );

      return belowRetailProducts;
    } catch (error) {
      logger.error('Error fetching from RapidAPI:', error);
      throw new ExternalApiError('Failed to fetch products from RapidAPI');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.get('/ping');
      return true;
    } catch (error) {
      logger.warn('RapidAPI health check failed:', error);
      return false;
    }
  }

  private transformProducts(apiProducts: RapidApiProduct[], brandName: string): Product[] {
    return apiProducts
      .filter((item) => item.brand?.toLowerCase() === brandName.toLowerCase())
      .map((item) => {
        const currentPrice = item.market?.lowest_ask ?? item.market?.last_sale ?? 0;
        const retailPrice = item.retail_price ?? 0;

        if (retailPrice === 0 || currentPrice === 0) {
          return null;
        }

        const discountPercentage = (retailPrice - currentPrice) / retailPrice;

        return {
          id: item.id,
          name: item.title,
          brand: item.brand,
          colorway: item.colorway || '',
          retailPrice,
          currentPrice,
          discountPercentage,
          ...(item.image?.small && { imageUrl: item.image.small }),
          stockxUrl: `https://stockx.com/${item.urlKey}`,
          lastUpdated: new Date(),
        };
      })
      .filter((product): product is Product => product !== null);
  }
}