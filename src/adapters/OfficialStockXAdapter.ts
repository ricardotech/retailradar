import axios, { AxiosInstance } from 'axios';
import { IStockXAdapter } from './IStockXAdapter';
import { Product } from '@/types';
import { logger } from '@/config/logger';
import { ExternalApiError } from '@/middleware/error-handler';

interface OfficialStockXProduct {
  id: string;
  name: string;
  brand: string;
  colorway: string;
  retailPrice: number;
  market: {
    lowestAsk: number;
    lastSale: number;
  };
  media: {
    imageUrl?: string;
  };
  urlKey: string;
  traits?: Array<{
    name: string;
    value: string;
  }>;
}

interface OfficialStockXResponse {
  data: {
    products: OfficialStockXProduct[];
    pagination: {
      hasNext: boolean;
      cursor?: string;
    };
  };
}

export class OfficialStockXAdapter implements IStockXAdapter {
  private client: AxiosInstance;
  private readonly baseUrl = 'https://gateway.stockx.com/api/v3';

  constructor(private readonly apiKey: string) {
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'RetailRadar/1.0.0',
      },
      timeout: 15000,
    });
  }

  async getSupremeProducts(): Promise<Product[]> {
    try {
      logger.info('Fetching Supreme products from Official StockX API');

      const allProducts: Product[] = [];
      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore && allProducts.length < 1000) {
        const response = await this.client.get<OfficialStockXResponse>('/catalog/search', {
          params: {
            query: 'supreme',
            productCategory: 'sneakers',
            limit: 100,
            ...(cursor && { cursor }),
          },
        });

        const products = response.data?.data?.products || [];
        const transformedProducts = this.transformProducts(products);
        allProducts.push(...transformedProducts);

        hasMore = response.data?.data?.pagination?.hasNext || false;
        cursor = response.data?.data?.pagination?.cursor;

        if (products.length === 0) {
          break;
        }
      }

      const belowRetailProducts = allProducts.filter(
        (product) => product.currentPrice < product.retailPrice
      );

      logger.info(
        `Found ${belowRetailProducts.length} Supreme products below retail from Official API`
      );

      return belowRetailProducts;
    } catch (error) {
      logger.error('Error fetching from Official StockX API:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new ExternalApiError('Invalid StockX API credentials');
        }
        if (error.response?.status === 429) {
          throw new ExternalApiError('StockX API rate limit exceeded');
        }
        if (error.response && error.response.status >= 500) {
          throw new ExternalApiError('StockX API server error');
        }
      }
      
      throw new ExternalApiError('Failed to fetch products from Official StockX API');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.client.get('/catalog/health');
      return response.status === 200;
    } catch (error) {
      logger.warn('Official StockX API health check failed:', error);
      return false;
    }
  }

  private transformProducts(apiProducts: OfficialStockXProduct[]): Product[] {
    return apiProducts
      .filter((item) => item.brand?.toLowerCase() === 'supreme')
      .map((item) => {
        const currentPrice = item.market?.lowestAsk || item.market?.lastSale || 0;
        const retailPrice = item.retailPrice || 0;

        if (retailPrice === 0 || currentPrice === 0) {
          return null;
        }

        const discountPercentage = Number(((retailPrice - currentPrice) / retailPrice).toFixed(4));
        const size = this.extractSize(item.traits);

        return {
          id: item.id,
          name: item.name,
          brand: item.brand,
          colorway: item.colorway || '',
          retailPrice,
          currentPrice,
          discountPercentage,
          ...(size && { size }),
          ...(item.media?.imageUrl && { imageUrl: item.media.imageUrl }),
          stockxUrl: `https://stockx.com/${item.urlKey}`,
          lastUpdated: new Date(),
        };
      })
      .filter((product): product is Product => product !== null);
  }

  private extractSize(traits?: Array<{ name: string; value: string }>): string | undefined {
    if (!traits) return undefined;
    
    const sizetrait = traits.find(trait => 
      trait.name.toLowerCase().includes('size') || 
      trait.name.toLowerCase().includes('us men')
    );
    
    return sizetrait?.value;
  }
}