import { logger } from '@/config/logger';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  timeout: number;
  monitoringPeriod: number;
  expectedErrors?: (error: Error) => boolean;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: number | undefined = undefined;
  private nextAttempt: number | undefined = undefined;

  constructor(
    private readonly name: string,
    private readonly options: CircuitBreakerOptions
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        logger.info(`Circuit breaker ${this.name} moved to HALF_OPEN state`);
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTime = undefined as undefined;
    
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      logger.info(`Circuit breaker ${this.name} moved to CLOSED state`);
    }
  }

  private onFailure(error: Error): void {
    const isExpectedError = this.options.expectedErrors?.(error) ?? true;
    
    if (!isExpectedError) {
      return;
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn(`Circuit breaker ${this.name} failure ${this.failureCount}/${this.options.failureThreshold}`, {
      error: error.message
    });

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttempt = Date.now() + this.options.timeout;
      
      logger.error(`Circuit breaker ${this.name} moved to OPEN state`, {
        failureCount: this.failureCount,
        nextAttempt: new Date(this.nextAttempt).toISOString()
      });
    }
  }

  private shouldAttemptReset(): boolean {
    return this.nextAttempt !== undefined && Date.now() >= this.nextAttempt;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : undefined,
      nextAttempt: this.nextAttempt ? new Date(this.nextAttempt).toISOString() : undefined
    };
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = undefined as undefined;
    this.nextAttempt = undefined as undefined;
    
    logger.info(`Circuit breaker ${this.name} has been reset`);
  }
}