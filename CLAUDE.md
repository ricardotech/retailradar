# RetailRadar - Claude Context

## Project Overview

RetailRadar is a TypeScript-first microservice that extracts Supreme products priced below retail on StockX. The service provides a REST API for developers and growth teams to access structured JSON data about Supreme products with below-retail pricing.

## Architecture & Technology Stack

### Core Technologies
- **Language**: TypeScript 5.0+ with strict type checking
- **Framework**: Express.js 4.18+ (NOT NestJS - explicitly using Express)
- **Database**: PostgreSQL 15+ with TypeORM 0.3+
- **Caching**: Redis for response caching (30-minute TTL)
- **Validation**: Zod for runtime type validation
- **Logging**: Pino for structured JSON logging

### Architecture Pattern
- **Clean Architecture** with clear separation of concerns
- **SOLID Principles** implementation throughout
- **Entity-based design** with domain-driven approach
- **Adapter Pattern** for multiple data sources (Official API, RapidAPI, Puppeteer scraping)

## Project Structure

```
src/
├── entities/           # Domain entities (Product, Price)
├── repositories/       # Data access layer with TypeORM
├── services/          # Business logic layer
├── adapters/          # External API integrations (StockX sources)
├── controllers/       # HTTP request handlers
├── middleware/        # Express middleware (error handling, validation, etc.)
├── config/           # Configuration management
├── utils/            # Shared utilities
└── types/            # TypeScript type definitions
```

## Development Guidelines

### Code Style & Conventions
- **No comments** unless explicitly requested
- **TypeScript-first** approach with strict typing
- **Clean Architecture** principles - respect layer boundaries
- **SOLID principles** in all implementations
- **Entity-based** domain modeling
- **Dependency injection** pattern for services

### Database Conventions
- Use **TypeORM entities** with decorators
- **UUID primary keys** for all entities
- **Camel case** for TypeScript properties, **snake_case** for database columns
- **Migrations** for all schema changes
- **Indexes** on frequently queried columns

### API Conventions
- **REST API** design with proper HTTP methods
- **JSON responses** with consistent structure
- **Zod validation** for all inputs
- **Cursor-based pagination** for large datasets
- **Error handling** with proper HTTP status codes

### Testing Requirements
- **Jest** for unit and integration testing
- **Supertest** for API endpoint testing
- **Test coverage > 85%** for core business logic
- **Integration tests** for all adapters
- **Mock external dependencies** in tests

## Business Logic

### Core Functionality
- Extract Supreme products from StockX with current price below retail price
- Calculate below-retail percentage: `(1 - currentPrice / retailPrice)`
- Support multiple data sources with fallback chain
- Cache responses for 30 minutes to reduce API calls
- Provide paginated results sorted by discount percentage

### Data Sources (Priority Order)
1. **Official StockX API** - Primary source when available
2. **RapidAPI StockX proxies** - Secondary fallback
3. **Puppeteer scraping** - Last resort with anti-bot measures

### Key Calculations
- **Below Retail Filter**: `currentPrice < retailPrice`
- **Discount Percentage**: `(retailPrice - currentPrice) / retailPrice`
- **Sort Order**: Descending by discount percentage

## External Integrations

### StockX Official API
- Catalog endpoints for product discovery
- Market endpoints for current pricing
- Rate limiting: 250 requests/day
- Requires developer account approval

### RapidAPI Integration
- Third-party StockX data proxies
- Faster integration but violates StockX ToS
- Pay-per-call pricing model
- Instant API key access

### Puppeteer Scraping
- Browser automation with stealth plugins
- Cloudflare Turnstile bypass capabilities
- 2Captcha/CapSolver integration for challenges
- Circuit breaker pattern for failures

## Performance Requirements

### Response Time Targets
- **API Response**: < 4 seconds (90th percentile)
- **Data Freshness**: < 30 minutes
- **Cache Hit Ratio**: > 70%
- **Uptime**: > 99%

### Scalability Considerations
- Connection pooling for database
- Redis caching layer
- Rate limiting for external APIs
- Circuit breaker for failing services

## Environment Configuration

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/retailradar
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=retailradar
DATABASE_USER=user
DATABASE_PASSWORD=password

# APIs
STOCKX_API_KEY=your_official_api_key
RAPIDAPI_KEY=your_rapidapi_key
CAPTCHA_SERVICE=2captcha
CAPTCHA_API_KEY=your_captcha_key

# Application
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Cache
REDIS_URL=redis://localhost:6379
CACHE_TTL=1800
```

## Development Workflow

### NPM Scripts
- `npm run dev` - Development server with hot reload
- `npm run build` - Production build
- `npm run test` - Run test suite
- `npm run lint` - ESLint code quality check
- `npm run typecheck` - TypeScript type checking
- `npm run db:migrate` - Run database migrations

### Testing Strategy
- Unit tests for business logic in services
- Integration tests for repository layer
- API tests for controller endpoints
- E2E tests for complete user flows
- Mock external APIs in development

## Security & Compliance

### Security Measures
- Input validation with Zod schemas
- SQL injection prevention via TypeORM
- Rate limiting on API endpoints
- Secrets management (no hardcoded keys)
- Security headers with Helmet.js

### Legal Considerations
- Prefer official StockX API to avoid ToS violations
- Implement respectful scraping with delays
- Circuit breaker to prevent abuse
- Monitor for legal compliance

## Deployment & Operations

### Container Strategy
- Docker multi-stage builds
- Container size < 200MB
- Health check endpoints
- Graceful shutdown handling

### Monitoring & Logging
- Structured JSON logging with Pino
- Health check endpoint at `/healthz`
- Prometheus metrics for monitoring
- Error tracking and alerting

## Common Patterns

### Error Handling
```typescript
// Use custom error classes with proper HTTP status codes
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### Service Layer Pattern
```typescript
// Inject repositories via constructor
export class SupremeService {
  constructor(
    private productRepository: ProductRepository,
    private cacheService: CacheService
  ) {}
}
```

### Adapter Pattern
```typescript
// Common interface for all StockX data sources
export interface IStockXAdapter {
  getSupremeProducts(): Promise<Product[]>;
}
```

## Development Notes

- **Always use TypeORM entities** for database operations
- **Never bypass validation** - use Zod schemas consistently
- **Implement proper error handling** at each layer
- **Cache expensive operations** with appropriate TTL
- **Log all external API calls** for debugging
- **Use dependency injection** for testability
- **Follow clean architecture** layer boundaries strictly

## Testing Commands

After making changes, always run:
1. `npm run typecheck` - Verify TypeScript compilation
2. `npm run lint` - Check code quality
3. `npm run test` - Ensure tests pass
4. `npm run test:e2e` - Verify end-to-end functionality