import { IStockXAdapter } from './IStockXAdapter';
import { Product } from '@/types';
import { CircuitBreaker, CircuitBreakerOptions } from '@/utils/CircuitBreaker';
import { logger } from '@/config/logger';

export class CircuitBreakerAdapter implements IStockXAdapter {
  private circuitBreaker: CircuitBreaker;

  constructor(
    private readonly adapter: IStockXAdapter,
    private readonly adapterName: string,
    options?: Partial<CircuitBreakerOptions>
  ) {
    const defaultOptions: CircuitBreakerOptions = {
      failureThreshold: 3,
      timeout: 60000, // 1 minute
      monitoringPeriod: 30000, // 30 seconds
      expectedErrors: (error: Error) => {
        // Don't trip circuit breaker for validation errors or client errors
        return !error.message.includes('validation') && 
               !error.message.includes('400') &&
               !error.message.includes('401') &&
               !error.message.includes('403');
      }
    };

    this.circuitBreaker = new CircuitBreaker(
      adapterName,
      { ...defaultOptions, ...options }
    );
  }

  async getSupremeProducts(): Promise<Product[]> {
    return this.circuitBreaker.execute(async () => {
      logger.info(`Executing getSupremeProducts through ${this.adapterName} adapter`);
      const products = await this.adapter.getSupremeProducts();
      
      if (!products || products.length === 0) {
        throw new Error(`${this.adapterName} adapter returned no products`);
      }
      
      return products;
    });
  }

  async isHealthy(): Promise<boolean> {
    try {
      return await this.circuitBreaker.execute(async () => {
        return await this.adapter.isHealthy();
      });
    } catch (error) {
      logger.warn(`${this.adapterName} health check failed:`, error);
      return false;
    }
  }

  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}