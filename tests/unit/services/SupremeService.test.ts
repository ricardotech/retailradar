import { SupremeService } from '@/services/SupremeService';
import { IStockXAdapter } from '@/adapters';
import { Product, DataSource } from '@/types';

const mockAdapter: IStockXAdapter = {
  getSupremeProducts: jest.fn(),
  isHealthy: jest.fn(),
};

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Supreme Box Logo Hoodie',
    brand: 'supreme',
    colorway: 'Black',
    retailPrice: 200,
    currentPrice: 150,
    discountPercentage: 0.25,
    stockxUrl: 'https://stockx.com/supreme-box-logo-hoodie',
    lastUpdated: new Date(),
  },
  {
    id: '2',
    name: 'Supreme Air Force 1',
    brand: 'supreme',
    colorway: 'White',
    retailPrice: 300,
    currentPrice: 180,
    discountPercentage: 0.4,
    stockxUrl: 'https://stockx.com/supreme-air-force-1',
    lastUpdated: new Date(),
  },
];

jest.mock('@/config/redis', () => ({
  redisClient: {
    get: jest.fn(),
    setEx: jest.fn(),
  },
  CACHE_TTL: 1800,
}));

describe('SupremeService', () => {
  let service: SupremeService;

  beforeEach(() => {
    service = new SupremeService([mockAdapter]);
    jest.clearAllMocks();
  });

  describe('getSupremeBelowRetail', () => {
    it('should return products sorted by discount percentage', async () => {
      (mockAdapter.isHealthy as jest.Mock).mockResolvedValue(true);
      (mockAdapter.getSupremeProducts as jest.Mock).mockResolvedValue(mockProducts);

      const result = await service.getSupremeBelowRetail({});

      expect(result.data).toHaveLength(2);
      expect(result.data[0].discountPercentage).toBe(0.4);
      expect(result.data[1].discountPercentage).toBe(0.25);
    });

    it('should filter products by minimum discount', async () => {
      (mockAdapter.isHealthy as jest.Mock).mockResolvedValue(true);
      (mockAdapter.getSupremeProducts as jest.Mock).mockResolvedValue(mockProducts);

      const result = await service.getSupremeBelowRetail({ minDiscount: 0.3 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('2');
    });

    it('should filter products by maximum price', async () => {
      (mockAdapter.isHealthy as jest.Mock).mockResolvedValue(true);
      (mockAdapter.getSupremeProducts as jest.Mock).mockResolvedValue(mockProducts);

      const result = await service.getSupremeBelowRetail({ maxPrice: 160 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('1');
    });

    it('should apply pagination correctly', async () => {
      (mockAdapter.isHealthy as jest.Mock).mockResolvedValue(true);
      (mockAdapter.getSupremeProducts as jest.Mock).mockResolvedValue(mockProducts);

      const result = await service.getSupremeBelowRetail({ limit: 1 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.cursor).toBe('2');
    });
  });
});