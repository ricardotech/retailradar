import { IStockXAdapter } from '@/adapters';
import { CircuitBreakerAdapter } from '@/adapters/CircuitBreakerAdapter';
import { Product } from '@/types';
import { logger } from '@/config/logger';

export interface AdapterConfig {
  adapter: IStockXAdapter;
  name: string;
  priority: number;
  retryCount?: number;
  retryDelay?: number;
}

export class AdapterManager {
  private wrappedAdapters: CircuitBreakerAdapter[] = [];

  constructor(adapters: AdapterConfig[]) {
    this.wrappedAdapters = adapters
      .sort((a, b) => a.priority - b.priority)
      .map(config => new CircuitBreakerAdapter(
        config.adapter,
        config.name,
        {
          failureThreshold: 3,
          timeout: 60000,
          monitoringPeriod: 30000
        }
      ));
  }

  async getBrandProducts(brandName: string): Promise<Product[]> {
    const errors: Error[] = [];

    for (const adapter of this.wrappedAdapters) {
      try {
        logger.info(`Attempting to fetch products from ${adapter.getCircuitBreakerStats().name}`);
        
        const isHealthy = await adapter.isHealthy();
        if (!isHealthy) {
          logger.warn(`Adapter ${adapter.getCircuitBreakerStats().name} is unhealthy, skipping`);
          errors.push(new Error(`${adapter.getCircuitBreakerStats().name} adapter is unhealthy`));
          continue;
        }

        const products = await this.executeWithRetry(
          () => adapter.getBrandProducts(brandName),
          3,
          2000
        );

        if (products && products.length > 0) {
          logger.info(`Successfully fetched ${products.length} products from ${adapter.getCircuitBreakerStats().name}`);
          return products;
        } else {
          const error = new Error(`${adapter.getCircuitBreakerStats().name} returned no products`);
          errors.push(error);
          logger.warn(error.message);
        }
      } catch (error) {
        const adapterError = error as Error;
        logger.error(`Error with adapter ${adapter.getCircuitBreakerStats().name}:`, adapterError);
        errors.push(adapterError);
        continue;
      }
    }

    const combinedError = new Error(
      `All adapters failed: ${errors.map(e => e.message).join('; ')}`
    );
    logger.error('All adapters failed to fetch products', { errors: errors.map(e => e.message) });
    throw combinedError;
  }

  async getAdapterStats() {
    return this.wrappedAdapters.map(adapter => adapter.getCircuitBreakerStats());
  }

  async getHealthStatus() {
    const results = await Promise.allSettled(
      this.wrappedAdapters.map(async adapter => ({
        name: adapter.getCircuitBreakerStats().name,
        healthy: await adapter.isHealthy(),
        circuitBreakerState: adapter.getCircuitBreakerStats().state
      }))
    );

    return results.map(result => 
      result.status === 'fulfilled' 
        ? result.value 
        : { 
            name: 'unknown', 
            healthy: false, 
            circuitBreakerState: 'UNKNOWN',
            error: result.reason?.message 
          }
    );
  }

  resetAllCircuitBreakers(): void {
    this.wrappedAdapters.forEach(adapter => {
      adapter.resetCircuitBreaker();
      logger.info(`Reset circuit breaker for ${adapter.getCircuitBreakerStats().name}`);
    });
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  }
}