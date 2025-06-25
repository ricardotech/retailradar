import { DataSource } from 'typeorm';
import { ProductRepository } from '@/repositories/ProductRepository';
import { Product } from '@/entities/Product';
import { testDataSource } from '@/config/test-setup';

describe('ProductRepository Integration Tests', () => {
  let dataSource: DataSource;
  let productRepository: ProductRepository;

  beforeAll(async () => {
    dataSource = await testDataSource.initialize();
    productRepository = new ProductRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await dataSource.synchronize(true);
  });

  describe('findBelowRetailProducts', () => {
    beforeEach(async () => {
      const products = [
        createTestProduct({
          name: 'Supreme Box Logo Tee',
          retailPrice: 100,
          currentPrice: 80,
          discountPercentage: 0.2,
          brand: 'Supreme',
        }),
        createTestProduct({
          name: 'Supreme Jordan 1',
          retailPrice: 200,
          currentPrice: 150,
          discountPercentage: 0.25,
          brand: 'Supreme',
        }),
        createTestProduct({
          name: 'Supreme Hoodie',
          retailPrice: 150,
          currentPrice: 160,
          discountPercentage: -0.0667,
          brand: 'Supreme',
        }),
        createTestProduct({
          name: 'Nike Air Force 1',
          retailPrice: 90,
          currentPrice: 70,
          discountPercentage: 0.2222,
          brand: 'Nike',
        }),
      ];

      await productRepository.saveMany(products);
    });

    it('should return only Supreme products below retail price', async () => {
      const result = await productRepository.findBelowRetailProducts({});

      expect(result).toHaveLength(2);
      expect(result.every(p => p.brand === 'Supreme')).toBe(true);
      expect(result.every(p => p.currentPrice < p.retailPrice)).toBe(true);
    });

    it('should filter by minimum discount percentage', async () => {
      const result = await productRepository.findBelowRetailProducts({
        minDiscount: 0.22,
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Supreme Jordan 1');
    });

    it('should filter by maximum price', async () => {
      const result = await productRepository.findBelowRetailProducts({
        maxPrice: 100,
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Supreme Box Logo Tee');
    });

    it('should sort by discount percentage descending', async () => {
      const result = await productRepository.findBelowRetailProducts({});

      expect(result[0].discountPercentage).toBeGreaterThan(result[1].discountPercentage);
    });

    it('should apply pagination with limit', async () => {
      const result = await productRepository.findBelowRetailProducts({
        limit: 1,
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('countBelowRetailProducts', () => {
    beforeEach(async () => {
      const products = [
        createTestProduct({
          name: 'Supreme Box Logo Tee',
          retailPrice: 100,
          currentPrice: 80,
          discountPercentage: 0.2,
          brand: 'Supreme',
        }),
        createTestProduct({
          name: 'Supreme Jordan 1',
          retailPrice: 200,
          currentPrice: 150,
          discountPercentage: 0.25,
          brand: 'Supreme',
        }),
        createTestProduct({
          name: 'Supreme Hoodie',
          retailPrice: 150,
          currentPrice: 160,
          discountPercentage: -0.0667,
          brand: 'Supreme',
        }),
      ];

      await productRepository.saveMany(products);
    });

    it('should count only Supreme products below retail', async () => {
      const count = await productRepository.countBelowRetailProducts({});
      expect(count).toBe(2);
    });

    it('should count with filters applied', async () => {
      const count = await productRepository.countBelowRetailProducts({
        minDiscount: 0.22,
      });
      expect(count).toBe(1);
    });
  });

  describe('findByStockxUrl', () => {
    it('should find product by StockX URL', async () => {
      const testProduct = createTestProduct({
        stockxUrl: 'https://stockx.com/supreme-box-logo-tee',
      });
      
      await productRepository.save(testProduct);

      const found = await productRepository.findByStockxUrl('https://stockx.com/supreme-box-logo-tee');
      
      expect(found).toBeTruthy();
      expect(found?.stockxUrl).toBe('https://stockx.com/supreme-box-logo-tee');
    });

    it('should return null for non-existent URL', async () => {
      const found = await productRepository.findByStockxUrl('https://stockx.com/non-existent');
      expect(found).toBeNull();
    });
  });

  describe('generateCursor', () => {
    it('should generate base64 encoded cursor', () => {
      const product = createTestProduct({
        discountPercentage: 0.25,
        createdAt: new Date('2023-01-01T00:00:00Z'),
      });

      const cursor = productRepository.generateCursor(product);
      const decoded = Buffer.from(cursor, 'base64').toString();
      
      expect(decoded).toBe('0.25|2023-01-01T00:00:00.000Z');
    });
  });
});

function createTestProduct(overrides: Partial<Product> = {}): Product {
  const product = new Product();
  
  product.name = overrides.name || 'Test Product';
  product.brand = overrides.brand || 'Supreme';
  product.colorway = overrides.colorway || 'Black';
  product.retailPrice = overrides.retailPrice || 100;
  product.currentPrice = overrides.currentPrice || 80;
  product.discountPercentage = overrides.discountPercentage || 0.2;
  product.size = overrides.size;
  product.sku = overrides.sku;
  product.imageUrl = overrides.imageUrl;
  product.stockxUrl = overrides.stockxUrl || 'https://stockx.com/test-product';
  product.createdAt = overrides.createdAt || new Date();
  product.updatedAt = overrides.updatedAt || new Date();

  return product;
}