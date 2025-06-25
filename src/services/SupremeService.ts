import { IStockXAdapter } from '@/adapters';
import { Product, PaginatedResponse, SupremeProductsQuery } from '@/types';
import { logger } from '@/config/logger';
import { redisClient, CACHE_TTL } from '@/config/redis';

export class SupremeService {
  constructor(private readonly adapters: IStockXAdapter[]) {}

  async getSupremeBelowRetail(
    query: SupremeProductsQuery
  ): Promise<PaginatedResponse<Product>> {
    const cacheKey = this.generateCacheKey(query);

    try {
      const cachedResult = await redisClient.get(cacheKey);
      if (cachedResult) {
        logger.info('Returning cached Supreme products');
        return JSON.parse(cachedResult) as PaginatedResponse<Product>;
      }
    } catch (error) {
      logger.warn('Cache read failed:', error);
    }

    const products = await this.fetchProductsFromAdapters();
    const filteredProducts = this.applyFilters(products, query);
    const sortedProducts = this.sortByDiscount(filteredProducts);
    const paginatedResult = this.applyPagination(sortedProducts, query);

    try {
      await redisClient.setEx(
        cacheKey,
        CACHE_TTL,
        JSON.stringify(paginatedResult)
      );
    } catch (error) {
      logger.warn('Cache write failed:', error);
    }

    return paginatedResult;
  }

  private async fetchProductsFromAdapters(): Promise<Product[]> {
    for (const adapter of this.adapters) {
      try {
        const isHealthy = await adapter.isHealthy();
        if (!isHealthy) {
          logger.warn(`Adapter ${adapter.constructor.name} is unhealthy, skipping`);
          continue;
        }

        const products = await adapter.getSupremeProducts();
        logger.info(
          `Successfully fetched ${products.length} products from ${adapter.constructor.name}`
        );
        return products;
      } catch (error) {
        logger.error(
          `Error fetching from ${adapter.constructor.name}:`,
          error
        );
        continue;
      }
    }

    throw new Error('All adapters failed to fetch products');
  }

  private applyFilters(products: Product[], query: SupremeProductsQuery): Product[] {
    let filtered = products;

    if (query.minDiscount !== undefined) {
      filtered = filtered.filter(
        (product) => product.discountPercentage >= query.minDiscount!
      );
    }

    if (query.maxPrice !== undefined) {
      filtered = filtered.filter(
        (product) => product.currentPrice <= query.maxPrice!
      );
    }

    if (query.size) {
      filtered = filtered.filter(
        (product) => product.size === query.size
      );
    }

    return filtered;
  }

  private sortByDiscount(products: Product[]): Product[] {
    return products.sort((a, b) => b.discountPercentage - a.discountPercentage);
  }

  private applyPagination(
    products: Product[],
    query: SupremeProductsQuery
  ): PaginatedResponse<Product> {
    const limit = query.limit || 20;
    let startIndex = 0;

    if (query.cursor) {
      const cursorIndex = products.findIndex(
        (product) => product.id === query.cursor
      );
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const endIndex = startIndex + limit;
    const paginatedProducts = products.slice(startIndex, endIndex);
    const hasNext = endIndex < products.length;
    const nextCursor = hasNext ? paginatedProducts[paginatedProducts.length - 1]?.id : undefined;

    return {
      data: paginatedProducts,
      pagination: {
        cursor: nextCursor,
        hasNext,
        total: products.length,
      },
    };
  }

  private generateCacheKey(query: SupremeProductsQuery): string {
    const params = new URLSearchParams();
    
    if (query.minDiscount !== undefined) {
      params.append('minDiscount', query.minDiscount.toString());
    }
    if (query.maxPrice !== undefined) {
      params.append('maxPrice', query.maxPrice.toString());
    }
    if (query.size) {
      params.append('size', query.size);
    }
    if (query.cursor) {
      params.append('cursor', query.cursor);
    }
    params.append('limit', (query.limit || 20).toString());

    return `supreme-below-retail:${params.toString()}`;
  }
}