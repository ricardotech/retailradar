import { Product, PaginatedResponse, BrandProductsQuery } from '@/types';
import { Product as ProductEntity } from '@/entities/Product';
import { ProductRepository } from '@/repositories/ProductRepository';
import { AdapterManager } from './AdapterManager';
import { logger } from '@/config/logger';
import { redisClient, CACHE_TTL } from '@/config/redis';

export class BrandService {
  private adapterManager: AdapterManager;

  constructor(
    adapterManager: AdapterManager,
    private readonly productRepository: ProductRepository
  ) {
    this.adapterManager = adapterManager;
  }

  async getBrandBelowRetail(
    brandName: string,
    query: BrandProductsQuery
  ): Promise<PaginatedResponse<Product>> {
    const cacheKey = this.generateCacheKey(brandName, query);

    try {
      const cachedResult = await redisClient.get(cacheKey);
      if (cachedResult) {
        logger.info(`Returning cached ${brandName} products`);
        return JSON.parse(cachedResult) as PaginatedResponse<Product>;
      }
    } catch (error) {
      logger.warn('Cache read failed:', error);
    }

    await this.refreshProductData(brandName);

    const products = await this.productRepository.findBelowRetailProducts(brandName, query);
    logger.info({
      productsFromDb: products.map(p => ({
        name: p.name,
        retailPrice: p.retailPrice,
        currentPrice: p.currentPrice
      }))
    }, 'Products fetched from DB');
    const total = await this.productRepository.countBelowRetailProducts(brandName, query);
    
    const lastProduct = products[products.length - 1];
    const paginatedResult: PaginatedResponse<Product> = {
      data: products.map(this.entityToDto),
      pagination: {
        ...(lastProduct && { cursor: this.productRepository.generateCursor(lastProduct) }),
        hasNext: products.length === (query.limit ?? 20),
        total,
      },
    };

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

  private async refreshProductData(brandName: string): Promise<void> {
    const freshProducts = await this.fetchProductsFromAdapters(brandName);
    
    logger.info(`Processing ${freshProducts.length} products from adapters.`);

    for (const product of freshProducts) {
      const entity = this.dtoToEntity(product);
      const existing = await this.productRepository.findByStockxUrl(entity.stockxUrl);

      if (existing) {
        logger.info({
          productId: existing.id,
          newPrice: entity.currentPrice
        }, 'Updating existing product');
        await this.productRepository.update(existing.id, {
          currentPrice: entity.currentPrice,
          discountPercentage: entity.discountPercentage,
          updatedAt: new Date(),
        });
      } else {
        logger.info({
          productName: entity.name
        }, 'Saving new product');
        await this.productRepository.save(entity);
      }
    }
  }

  private async fetchProductsFromAdapters(brandName: string): Promise<Product[]> {
    const products = await this.adapterManager.getBrandProducts(brandName);
    logger.info({ 
      productsFromAdapters: products.map(p => ({ 
        name: p.name, 
        retailPrice: p.retailPrice, 
        currentPrice: p.currentPrice 
      })) 
    }, 'Products fetched from adapters');

    const belowRetailProducts = products.filter(product => 
      product.currentPrice < product.retailPrice
    );
    logger.info({ 
      belowRetailProducts: belowRetailProducts.map(p => ({ 
        name: p.name, 
        retailPrice: p.retailPrice, 
        currentPrice: p.currentPrice 
      })) 
    }, 'Products filtered for below retail');
    
    return belowRetailProducts.map(product => ({
      ...product,
      discountPercentage: this.calculateDiscountPercentage(product.retailPrice, product.currentPrice)
    }));
  }

  private calculateDiscountPercentage(retailPrice: number, currentPrice: number): number {
    if (retailPrice <= 0) return 0;
    return Number(((retailPrice - currentPrice) / retailPrice).toFixed(4));
  }

  private entityToDto(entity: ProductEntity): Product {
    return {
      id: entity.id,
      name: entity.name,
      brand: entity.brand,
      colorway: entity.colorway,
      retailPrice: entity.retailPrice,
      currentPrice: entity.currentPrice,
      discountPercentage: entity.discountPercentage,
      ...(entity.size && { size: entity.size }),
      ...(entity.sku && { sku: entity.sku }),
      ...(entity.imageUrl && { imageUrl: entity.imageUrl }),
      stockxUrl: entity.stockxUrl,
      lastUpdated: entity.updatedAt,
    };
  }

  private dtoToEntity(dto: Product): ProductEntity {
    const entity = new ProductEntity();
    entity.name = dto.name;
    entity.brand = dto.brand;
    entity.colorway = dto.colorway;
    entity.retailPrice = dto.retailPrice;
    entity.currentPrice = dto.currentPrice;
    entity.discountPercentage = dto.discountPercentage;
    if (dto.size) entity.size = dto.size;
    if (dto.sku) entity.sku = dto.sku;
    if (dto.imageUrl) entity.imageUrl = dto.imageUrl;
    entity.stockxUrl = dto.stockxUrl;
    return entity;
  }

  async getAdapterStats() {
    return await this.adapterManager.getAdapterStats();
  }

  async getHealthStatus(): Promise<{ name: string; healthy: boolean; circuitBreakerState: import("/root/Projects/retail/retailradar/src/utils/CircuitBreaker").CircuitBreakerState | 'UNKNOWN'; error?: unknown; }[]> {
    return await this.adapterManager.getHealthStatus();
  }

  resetCircuitBreakers(): void {
    this.adapterManager.resetAllCircuitBreakers();
  }

  private generateCacheKey(brandName: string, query: BrandProductsQuery): string {
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

    return `${brandName.toLowerCase()}-below-retail:${params.toString()}`;
  }
}