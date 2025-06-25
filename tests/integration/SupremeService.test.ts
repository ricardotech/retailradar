import { DataSource } from 'typeorm';
import { SupremeService } from '@/services/SupremeService';
import { ProductRepository } from '@/repositories/ProductRepository';
import { IStockXAdapter } from '@/adapters/IStockXAdapter';
import { Product } from '@/types';
import { testDataSource } from '@/config/test-setup';

class MockStockXAdapter implements IStockXAdapter {
  private mockProducts: Product[] = [];
  private healthy = true;

  setMockProducts(products: Product[]) {
    this.mockProducts = products;
  }

  setHealthy(healthy: boolean) {
    this.healthy = healthy;
  }

  async getSupremeProducts(): Promise<Product[]> {
    if (!this.healthy) {
      throw new Error('Adapter is unhealthy');
    }
    return this.mockProducts;
  }

  async isHealthy(): Promise<boolean> {
    return this.healthy;
  }
}

describe('SupremeService Integration Tests', () => {
  let dataSource: DataSource;
  let productRepository: ProductRepository;
  let mockAdapter: MockStockXAdapter;
  let supremeService: SupremeService;

  beforeAll(async () => {
    dataSource = await testDataSource.initialize();
    productRepository = new ProductRepository(dataSource);
    mockAdapter = new MockStockXAdapter();
    supremeService = new SupremeService([mockAdapter], productRepository);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
    mockAdapter.setHealthy(true);
    mockAdapter.setMockProducts([]);
  });

  describe('getSupremeBelowRetail', () => {
    it('should return paginated below-retail products', async () => {
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Supreme Box Logo Tee',
          brand: 'Supreme',
          colorway: 'Black',
          retailPrice: 100,
          currentPrice: 80,
          discountPercentage: 0.2,
          stockxUrl: 'https://stockx.com/supreme-box-logo-tee-black',
          lastUpdated: new Date(),
        },
        {
          id: '2',
          name: 'Supreme Jordan 1',
          brand: 'Supreme',
          colorway: 'Red',
          retailPrice: 200,
          currentPrice: 150,
          discountPercentage: 0.25,
          stockxUrl: 'https://stockx.com/supreme-jordan-1-red',
          lastUpdated: new Date(),
        },
      ];

      mockAdapter.setMockProducts(mockProducts);

      const result = await supremeService.getSupremeBelowRetail({});

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toHaveProperty('hasNext');
      expect(result.pagination).toHaveProperty('total');
      expect(result.data[0].discountPercentage).toBeGreaterThanOrEqual(result.data[1].discountPercentage);
    });

    it('should filter by minimum discount', async () => {
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Supreme Box Logo Tee',
          brand: 'Supreme',
          colorway: 'Black',
          retailPrice: 100,
          currentPrice: 80,
          discountPercentage: 0.2,
          stockxUrl: 'https://stockx.com/supreme-box-logo-tee-black',
          lastUpdated: new Date(),
        },
        {
          id: '2',
          name: 'Supreme Jordan 1',
          brand: 'Supreme',
          colorway: 'Red',
          retailPrice: 200,
          currentPrice: 150,
          discountPercentage: 0.25,
          stockxUrl: 'https://stockx.com/supreme-jordan-1-red',
          lastUpdated: new Date(),
        },
      ];

      mockAdapter.setMockProducts(mockProducts);

      const result = await supremeService.getSupremeBelowRetail({
        minDiscount: 0.22,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Supreme Jordan 1');
    });

    it('should handle adapter failures with fallback', async () => {
      const healthyAdapter = new MockStockXAdapter();
      const unhealthyAdapter = new MockStockXAdapter();
      
      unhealthyAdapter.setHealthy(false);
      healthyAdapter.setMockProducts([
        {
          id: '1',
          name: 'Supreme Box Logo Tee',
          brand: 'Supreme',
          colorway: 'Black',
          retailPrice: 100,
          currentPrice: 80,
          discountPercentage: 0.2,
          stockxUrl: 'https://stockx.com/supreme-box-logo-tee-black',
          lastUpdated: new Date(),
        },
      ]);

      const serviceWithFallback = new SupremeService(
        [unhealthyAdapter, healthyAdapter],
        productRepository
      );

      const result = await serviceWithFallback.getSupremeBelowRetail({});

      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Supreme Box Logo Tee');
    });

    it('should throw error when all adapters fail', async () => {
      mockAdapter.setHealthy(false);

      await expect(
        supremeService.getSupremeBelowRetail({})
      ).rejects.toThrow('All adapters failed to fetch products');
    });

    it('should update existing products in database', async () => {
      const existingProduct = {
        id: '1',
        name: 'Supreme Box Logo Tee',
        brand: 'Supreme',
        colorway: 'Black',
        retailPrice: 100,
        currentPrice: 80,
        discountPercentage: 0.2,
        stockxUrl: 'https://stockx.com/supreme-box-logo-tee-black',
        lastUpdated: new Date(),
      };

      mockAdapter.setMockProducts([existingProduct]);

      await supremeService.getSupremeBelowRetail({});

      const updatedProduct = {
        ...existingProduct,
        currentPrice: 70,
      };

      mockAdapter.setMockProducts([updatedProduct]);

      const result = await supremeService.getSupremeBelowRetail({});
      
      const productInDb = await productRepository.findByStockxUrl(existingProduct.stockxUrl);
      expect(productInDb?.currentPrice).toBe(70);
    });

    it('should apply pagination correctly', async () => {
      const mockProducts: Product[] = Array.from({ length: 25 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Supreme Product ${i + 1}`,
        brand: 'Supreme',
        colorway: 'Black',
        retailPrice: 100,
        currentPrice: 80 - i,
        discountPercentage: (20 + i) / 100,
        stockxUrl: `https://stockx.com/supreme-product-${i + 1}`,
        lastUpdated: new Date(),
      }));

      mockAdapter.setMockProducts(mockProducts);

      const result = await supremeService.getSupremeBelowRetail({
        limit: 10,
      });

      expect(result.data).toHaveLength(10);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.cursor).toBeDefined();
    });
  });

  describe('calculateDiscountPercentage', () => {
    it('should calculate discount percentage correctly', async () => {
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Supreme Box Logo Tee',
          brand: 'Supreme',
          colorway: 'Black',
          retailPrice: 100,
          currentPrice: 80,
          discountPercentage: 0,
          stockxUrl: 'https://stockx.com/supreme-box-logo-tee-black',
          lastUpdated: new Date(),
        },
      ];

      mockAdapter.setMockProducts(mockProducts);

      const result = await supremeService.getSupremeBelowRetail({});

      expect(result.data[0].discountPercentage).toBe(0.2);
    });

    it('should handle zero retail price', async () => {
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Supreme Box Logo Tee',
          brand: 'Supreme',
          colorway: 'Black',
          retailPrice: 0,
          currentPrice: 80,
          discountPercentage: 0,
          stockxUrl: 'https://stockx.com/supreme-box-logo-tee-black',
          lastUpdated: new Date(),
        },
      ];

      mockAdapter.setMockProducts(mockProducts);

      const result = await supremeService.getSupremeBelowRetail({});

      expect(result.data[0].discountPercentage).toBe(0);
    });
  });
});