# RetailRadar Tech Stack

## Architecture Overview

RetailRadar follows **Clean Architecture** principles with **SOLID** design patterns, built using TypeScript, Express.js, TypeORM, and PostgreSQL. The application is designed for scalability, maintainability, and testability.

## Technology Stack

### Core Technologies

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| **Runtime** | Node.js | 20+ | JavaScript runtime environment |
| **Language** | TypeScript | 5.0+ | Type-safe JavaScript with compile-time checking |
| **Framework** | Express.js | 4.18+ | Minimal web application framework |
| **Database** | PostgreSQL | 15+ | Primary relational database |
| **ORM** | TypeORM | 0.3+ | Database abstraction and migrations |
| **Validation** | Zod | 3.21+ | Runtime type validation and parsing |
| **Logging** | Pino | 8.14+ | High-performance JSON logger |
| **Cache** | Redis | 7+ | In-memory data store for caching |

### Development & Testing

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Testing Framework** | Jest | Unit and integration testing |
| **E2E Testing** | Supertest | HTTP assertion testing |
| **Code Quality** | ESLint + Prettier | Linting and code formatting |
| **Type Checking** | TypeScript Compiler | Static type analysis |
| **Test Coverage** | Jest Coverage | Code coverage reporting |
| **Pre-commit** | Husky + lint-staged | Git hooks for quality gates |

### External Integrations

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Web Scraping** | Puppeteer | Browser automation for StockX scraping |
| **Anti-Detection** | puppeteer-extra-plugin-stealth | Bypass bot detection |
| **Captcha Solving** | 2Captcha/CapSolver | Automated captcha resolution |
| **HTTP Client** | Axios | REST API calls to StockX and RapidAPI |
| **Rate Limiting** | express-rate-limit | API request throttling |

### DevOps & Deployment

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Containerization** | Docker | Application packaging |
| **Orchestration** | Docker Compose | Local development environment |
| **CI/CD** | GitHub Actions | Automated testing and deployment |
| **Monitoring** | Prometheus + Grafana | Metrics collection and visualization |
| **APM** | New Relic / DataDog | Application performance monitoring |
| **Secrets** | AWS Secrets Manager | Secure credential management |

---

## Clean Architecture Implementation

### Layer Structure

```
src/
├── entities/           # Enterprise Business Rules
│   ├── product/
│   │   ├── product.entity.ts
│   │   ├── product.types.ts
│   │   └── product.validator.ts
│   └── price/
│       ├── price.entity.ts
│       ├── price.types.ts
│       └── price.validator.ts
├── repositories/       # Interface Adapters (Data Layer)
│   ├── product.repository.ts
│   ├── price.repository.ts
│   └── base.repository.ts
├── services/          # Application Business Rules
│   ├── supreme.service.ts
│   ├── price-calculator.service.ts
│   └── cache.service.ts
├── adapters/          # Frameworks & Drivers (External APIs)
│   ├── stockx-official.adapter.ts
│   ├── stockx-rapid.adapter.ts
│   ├── stockx-scraper.adapter.ts
│   └── base.adapter.ts
├── controllers/       # Interface Adapters (Presentation Layer)
│   ├── supreme.controller.ts
│   ├── health.controller.ts
│   └── base.controller.ts
├── middleware/        # Framework-specific Components
│   ├── error-handler.middleware.ts
│   ├── validation.middleware.ts
│   ├── rate-limit.middleware.ts
│   └── logging.middleware.ts
├── config/           # Configuration Management
│   ├── database.config.ts
│   ├── app.config.ts
│   └── environment.config.ts
└── utils/            # Shared Utilities
    ├── logger.util.ts
    ├── error.util.ts
    └── response.util.ts
```

### SOLID Principles Implementation

#### 1. Single Responsibility Principle (SRP)
- **Product Entity**: Only handles product data structure and business rules
- **SupremeService**: Only handles Supreme-specific business logic
- **StockXAdapter**: Only handles StockX API communication

#### 2. Open/Closed Principle (OCP)
- **Adapter Pattern**: New data sources can be added without modifying existing code
- **Strategy Pattern**: Different pricing strategies can be plugged in

#### 3. Liskov Substitution Principle (LSP)
- **BaseAdapter**: All adapters implement the same interface and are interchangeable
- **BaseRepository**: All repositories follow the same contract

#### 4. Interface Segregation Principle (ISP)
- **Specific Interfaces**: Separate interfaces for different concerns (IProductAdapter, IPriceCalculator)
- **Minimal Dependencies**: Components only depend on interfaces they actually use

#### 5. Dependency Inversion Principle (DIP)
- **Dependency Injection**: High-level modules depend on abstractions, not concretions
- **IoC Container**: Services injected through constructors

---

## Database Design

### Entity Relationship Model

```sql
-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stockx_id VARCHAR(255) UNIQUE NOT NULL,
    brand VARCHAR(100) NOT NULL,
    name VARCHAR(500) NOT NULL,
    colorway VARCHAR(100),
    retail_price DECIMAL(10,2),
    product_url VARCHAR(1000),
    image_url VARCHAR(1000),
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prices table (time-series data)
CREATE TABLE prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    current_price DECIMAL(10,2) NOT NULL,
    below_retail_percent DECIMAL(5,4),
    data_source VARCHAR(50) NOT NULL, -- 'official', 'rapidapi', 'scraper'
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_stockx_id ON products(stockx_id);
CREATE INDEX idx_prices_product_id ON prices(product_id);
CREATE INDEX idx_prices_fetched_at ON prices(fetched_at);
CREATE INDEX idx_prices_below_retail ON prices(below_retail_percent) WHERE below_retail_percent > 0;
```

### TypeORM Entities

```typescript
// src/entities/product/product.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Price } from '../price/price.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stockx_id', unique: true })
  stockxId: string;

  @Column({ length: 100 })
  brand: string;

  @Column({ length: 500 })
  name: string;

  @Column({ length: 100, nullable: true })
  colorway?: string;

  @Column({ name: 'retail_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  retailPrice?: number;

  @Column({ name: 'product_url', length: 1000, nullable: true })
  productUrl?: string;

  @Column({ name: 'image_url', length: 1000, nullable: true })
  imageUrl?: string;

  @Column({ length: 100, nullable: true })
  category?: string;

  @OneToMany(() => Price, price => price.product)
  prices: Price[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## Application Configuration

### Environment Variables

```typescript
// src/config/environment.config.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  
  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_HOST: z.string().default('localhost'),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_NAME: z.string(),
  DATABASE_USER: z.string(),
  DATABASE_PASSWORD: z.string(),
  
  // External APIs
  STOCKX_API_KEY: z.string().optional(),
  RAPIDAPI_KEY: z.string().optional(),
  CAPTCHA_SERVICE: z.enum(['2captcha', 'capsolver']).default('2captcha'),
  CAPTCHA_API_KEY: z.string().optional(),
  
  // Cache
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  CACHE_TTL: z.coerce.number().default(1800), // 30 minutes
  
  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Environment = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);
```

### Database Configuration

```typescript
// src/config/database.config.ts
import { DataSource } from 'typeorm';
import { env } from './environment.config';
import { Product } from '../entities/product/product.entity';
import { Price } from '../entities/price/price.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  host: env.DATABASE_HOST,
  port: env.DATABASE_PORT,
  username: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  synchronize: env.NODE_ENV === 'development',
  logging: env.NODE_ENV === 'development',
  entities: [Product, Price],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
```

---

## API Design

### REST API Structure

```typescript
// src/controllers/supreme.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { SupremeService } from '../services/supreme.service';

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(250).default(50),
  cursor: z.string().optional(),
  minDiscount: z.coerce.number().min(0).max(1).optional(),
});

export class SupremeController {
  constructor(private supremeService: SupremeService) {}

  async getBelowRetailProducts(req: Request, res: Response): Promise<void> {
    const query = querySchema.parse(req.query);
    
    const result = await this.supremeService.getBelowRetailProducts(query);
    
    res.json({
      data: result.products,
      pagination: {
        next_cursor: result.nextCursor,
        has_more: result.hasMore,
        total_count: result.totalCount,
      },
    });
  }
}
```

### Error Handling

```typescript
// src/middleware/error-handler.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.util';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error(error, 'Unhandled error occurred');

  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      details: error.errors,
    });
    return;
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    code: error.code,
    timestamp: new Date().toISOString(),
  });
}
```

---

## Performance Considerations

### Caching Strategy

```typescript
// src/services/cache.service.ts
import Redis from 'ioredis';
import { env } from '../config/environment.config';

export class CacheService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(env.REDIS_URL);
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set(key: string, value: any, ttl: number = env.CACHE_TTL): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

### Database Optimization

- **Indexes**: Strategic indexes on frequently queried columns
- **Connection Pooling**: TypeORM connection pooling for concurrent requests
- **Query Optimization**: Use select specific fields, avoid N+1 queries
- **Pagination**: Cursor-based pagination for large datasets

### Memory Management

- **Streaming**: Use streams for large data processing
- **Connection Limits**: Limit concurrent browser instances for scraping
- **Garbage Collection**: Monitor and optimize Node.js garbage collection

---

## Security Implementation

### Input Validation

```typescript
// src/middleware/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

export const validate = (schema: AnyZodObject) => 
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
```

### Security Headers

```typescript
// src/middleware/security.middleware.ts
import helmet from 'helmet';
import cors from 'cors';

export const securityMiddleware = [
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  }),
];
```

---

## Monitoring & Observability

### Logging Configuration

```typescript
// src/utils/logger.util.ts
import pino from 'pino';
import { env } from '../config/environment.config';

export const logger = pino({
  level: env.LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(env.NODE_ENV === 'production' && {
    redact: ['req.headers.authorization', 'req.body.password'],
  }),
});
```

### Health Checks

```typescript
// src/controllers/health.controller.ts
export class HealthController {
  async healthCheck(req: Request, res: Response): Promise<void> {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || 'unknown',
      checks: {
        database: await this.checkDatabase(),
        redis: await this.checkRedis(),
        stockx_api: await this.checkStockXAPI(),
      },
    };

    const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
    res.status(allHealthy ? 200 : 503).json(health);
  }
}
```

This comprehensive tech stack provides a solid foundation for building a scalable, maintainable, and robust RetailRadar service following industry best practices and clean architecture principles.