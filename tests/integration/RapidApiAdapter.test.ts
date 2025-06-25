import nock from 'nock';
import { RapidApiAdapter } from '@/adapters/RapidApiAdapter';
import { ExternalApiError } from '@/middleware/error-handler';

describe('RapidApiAdapter Integration Tests', () => {
  let adapter: RapidApiAdapter;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    adapter = new RapidApiAdapter(mockApiKey);
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('getSupremeProducts', () => {
    it('should fetch and transform Supreme products successfully', async () => {
      const mockResponse = {
        data: {
          products: [
            {
              id: '1',
              title: 'Supreme Box Logo Hoodie',
              brand: 'Supreme',
              colorway: 'Black',
              retail_price: 158,
              market: {
                lowest_ask: 300,
                last_sale: 280,
              },
              image: {
                small: 'https://images.stockx.com/test.jpg',
              },
              urlKey: 'supreme-box-logo-hoodie-black',
            },
            {
              id: '2',
              title: 'Supreme Jordan 1 Retro High',
              brand: 'Supreme',
              colorway: 'Red',
              retail_price: 160,
              market: {
                lowest_ask: 120,
                last_sale: 110,
              },
              image: {
                small: 'https://images.stockx.com/test2.jpg',
              },
              urlKey: 'supreme-jordan-1-retro-high-red',
            },
            {
              id: '3',
              title: 'Supreme Box Logo Tee',
              brand: 'Supreme',
              colorway: 'White',
              retail_price: 44,
              market: {
                lowest_ask: 200,
                last_sale: 180,
              },
              image: {
                small: 'https://images.stockx.com/test3.jpg',
              },
              urlKey: 'supreme-box-logo-tee-white',
            },
          ],
        },
      };

      nock('https://stockx1.p.rapidapi.com')
        .get('/search')
        .query({
          query: 'supreme',
          category: 'shoes',
          limit: 100,
        })
        .reply(200, mockResponse);

      const products = await adapter.getSupremeProducts();

      expect(products).toHaveLength(1);
      expect(products[0]).toMatchObject({
        id: '2',
        name: 'Supreme Jordan 1 Retro High',
        brand: 'Supreme',
        colorway: 'Red',
        retailPrice: 160,
        currentPrice: 120,
        imageUrl: 'https://images.stockx.com/test2.jpg',
        stockxUrl: 'https://stockx.com/supreme-jordan-1-retro-high-red',
      });
      expect(products[0].discountPercentage).toBeCloseTo(0.25);
    });

    it('should filter out products with zero prices', async () => {
      const mockResponse = {
        data: {
          products: [
            {
              id: '1',
              title: 'Supreme Box Logo Hoodie',
              brand: 'Supreme',
              colorway: 'Black',
              retail_price: 0,
              market: {
                lowest_ask: 300,
                last_sale: 280,
              },
              urlKey: 'supreme-box-logo-hoodie-black',
            },
            {
              id: '2',
              title: 'Supreme Jordan 1',
              brand: 'Supreme',
              colorway: 'Red',
              retail_price: 160,
              market: {},
              urlKey: 'supreme-jordan-1-red',
            },
          ],
        },
      };

      nock('https://stockx1.p.rapidapi.com')
        .get('/search')
        .reply(200, mockResponse);

      const products = await adapter.getSupremeProducts();

      expect(products).toHaveLength(0);
    });

    it('should filter out non-Supreme products', async () => {
      const mockResponse = {
        data: {
          products: [
            {
              id: '1',
              title: 'Nike Air Force 1',
              brand: 'Nike',
              colorway: 'White',
              retail_price: 90,
              market: {
                lowest_ask: 80,
              },
              urlKey: 'nike-air-force-1-white',
            },
          ],
        },
      };

      nock('https://stockx1.p.rapidapi.com')
        .get('/search')
        .reply(200, mockResponse);

      const products = await adapter.getSupremeProducts();

      expect(products).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      nock('https://stockx1.p.rapidapi.com')
        .get('/search')
        .reply(500, { error: 'Internal Server Error' });

      await expect(adapter.getSupremeProducts()).rejects.toThrow(ExternalApiError);
    });

    it('should handle network errors', async () => {
      nock('https://stockx1.p.rapidapi.com')
        .get('/search')
        .replyWithError('Network error');

      await expect(adapter.getSupremeProducts()).rejects.toThrow(ExternalApiError);
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        data: {
          products: [],
        },
      };

      nock('https://stockx1.p.rapidapi.com')
        .get('/search')
        .reply(200, mockResponse);

      const products = await adapter.getSupremeProducts();

      expect(products).toHaveLength(0);
    });

    it('should handle malformed response', async () => {
      nock('https://stockx1.p.rapidapi.com')
        .get('/search')
        .reply(200, { invalid: 'response' });

      const products = await adapter.getSupremeProducts();

      expect(products).toHaveLength(0);
    });
  });

  describe('isHealthy', () => {
    it('should return true when health check passes', async () => {
      nock('https://stockx1.p.rapidapi.com')
        .get('/ping')
        .reply(200, { status: 'ok' });

      const isHealthy = await adapter.isHealthy();

      expect(isHealthy).toBe(true);
    });

    it('should return false when health check fails', async () => {
      nock('https://stockx1.p.rapidapi.com')
        .get('/ping')
        .reply(500, { error: 'Service unavailable' });

      const isHealthy = await adapter.isHealthy();

      expect(isHealthy).toBe(false);
    });

    it('should return false on network error', async () => {
      nock('https://stockx1.p.rapidapi.com')
        .get('/ping')
        .replyWithError('Network error');

      const isHealthy = await adapter.isHealthy();

      expect(isHealthy).toBe(false);
    });
  });

  describe('request headers', () => {
    it('should include correct API headers', async () => {
      const scope = nock('https://stockx1.p.rapidapi.com', {
        reqheaders: {
          'X-RapidAPI-Key': mockApiKey,
          'X-RapidAPI-Host': 'stockx1.p.rapidapi.com',
        },
      })
        .get('/search')
        .reply(200, { data: { products: [] } });

      await adapter.getSupremeProducts();

      expect(scope.isDone()).toBe(true);
    });
  });
});