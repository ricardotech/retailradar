# RetailRadar

A TypeScript-first microservice that extracts Supreme products priced below retail on StockX.

## Overview

RetailRadar provides a clean REST API to discover Supreme products currently selling below their retail price on StockX. Built with TypeScript, Express, TypeORM, and PostgreSQL following clean architecture principles.

## Features

- **Below-Retail Detection**: Automatically identifies Supreme products priced under retail
- **Multiple Data Sources**: Official StockX API, RapidAPI fallbacks, and Puppeteer scraping
- **Clean Architecture**: Domain-driven design with SOLID principles
- **Type Safety**: Full TypeScript implementation with strict type checking
- **Pagination**: Cursor-based pagination for large result sets
- **Health Monitoring**: Built-in health checks and observability

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js with clean architecture
- **Database**: PostgreSQL with TypeORM
- **Validation**: Zod for runtime type validation
- **Testing**: Jest with supertest
- **Logging**: Pino for structured JSON logging
- **Containerization**: Docker with multi-stage builds

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Docker (optional)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd retailradar

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Set up database
npm run db:setup

# Run development server
npm run dev
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/retailradar
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=retailradar
DATABASE_USER=user
DATABASE_PASSWORD=password

# StockX API
STOCKX_API_KEY=your_official_api_key
RAPIDAPI_KEY=your_rapidapi_key

# Captcha Services (for scraping fallback)
CAPTCHA_SERVICE=2captcha
CAPTCHA_API_KEY=your_captcha_key

# Application
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Redis Cache
REDIS_URL=redis://localhost:6379
CACHE_TTL=1800
```

## API Endpoints

### Get Supreme Below-Retail Products

```http
GET /api/v1/supreme-below-retail
```

**Query Parameters:**
- `limit` (optional): Number of results per page (default: 50, max: 250)
- `cursor` (optional): Pagination cursor for next page
- `minDiscount` (optional): Minimum discount percentage (0.0-1.0)

**Response:**
```json
{
  "data": [
    {
      "brand": "Supreme",
      "name": "Supreme Nike NBA Wristbands (Pack Of 2) Black",
      "colorway": "Black",
      "retail_price": 30,
      "current_price": 22,
      "below_retail_percent": 0.2667,
      "product_url": "https://stockx.com/supreme-nike-nba-wristbands-red",
      "last_updated": "2025-06-24T14:32:18Z"
    }
  ],
  "pagination": {
    "next_cursor": "eyJpZCI6MTIzfQ==",
    "has_more": true,
    "total_count": 150
  }
}
```

### Health Check

```http
GET /healthz
```

## Development

### Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with test data
npm run db:reset     # Reset database (dev only)

# Testing
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run test:watch   # Run tests in watch mode
npm run test:cov     # Generate test coverage

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run typecheck    # Run TypeScript type checking
npm run format       # Format code with Prettier
```

### Project Structure

```
src/
├── entities/           # Domain entities
│   ├── product/
│   └── price/
├── repositories/       # Data access layer
├── services/          # Business logic
├── adapters/          # External API integrations
│   ├── stockx-official.ts
│   ├── stockx-rapid.ts
│   └── stockx-scraper.ts
├── controllers/       # HTTP request handlers
├── middleware/        # Express middleware
├── config/           # Configuration
├── utils/            # Shared utilities
└── types/            # Type definitions
```

## Deployment

### Docker

```bash
# Build image
docker build -t retailradar .

# Run with Docker Compose
docker-compose up -d
```

### Production Considerations

- Use Redis for caching API responses (30-minute TTL)
- Set up rate limiting for external APIs
- Configure log aggregation (CloudWatch, ELK stack)
- Monitor with health checks and alerts
- Use secrets management for API keys

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.