# RetailRadar

A TypeScript microservice that extracts Supreme products priced below retail on StockX using web scraping.

## Overview

RetailRadar provides a clean REST API to discover Supreme products currently selling below their retail price on StockX. Built with TypeScript, Express, and Puppeteer for web scraping.

## Features

- **Below-Retail Detection**: Automatically identifies Supreme products priced under retail
- **Web Scraping**: Uses Puppeteer to scrape StockX product data
- **JSON API**: Returns structured JSON data for easy integration
- **Type Safety**: Full TypeScript implementation
- **Health Monitoring**: Built-in health checks

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Scraping**: Puppeteer for web automation
- **Database**: PostgreSQL with TypeORM
- **Cache**: Redis for response caching
- **Validation**: Zod for runtime type validation
- **Testing**: Jest
- **Logging**: Pino for structured JSON logging
- **Containerization**: Docker with multi-stage builds

## 🚀 Quick Start

### Prerequisites
- Docker Desktop installed (recommended)
- OR Node.js 18+, PostgreSQL 15+, Redis 7+ for local development

## 🐳 **Option 1: Docker Setup (Recommended)**

### Step-by-Step Instructions

**1. Clone and Navigate to Project**
```bash
git clone <repository-url>
cd retailradar
```

**2. Start Infrastructure with Docker Compose**
```bash
# Start PostgreSQL and Redis services
docker-compose up -d postgres redis

# Wait for services to be healthy (30-60 seconds)
docker-compose ps
```

**3. Build and Run the Application**
```bash
# ✅ WORKING: Minimal setup (just the scraper, fastest)
docker-compose -f docker-compose.minimal.yml up --build

# Option B: Full stack with database and Redis (if needed later)
docker-compose up --build

# Or run in detached mode
docker-compose -f docker-compose.minimal.yml up -d --build
```

**4. Verify Everything is Running**
```bash
# Check all services
docker-compose ps

# Check logs
docker-compose logs app
docker-compose logs postgres  
docker-compose logs redis
```

**5. Test the API**
```bash
# Health check
curl http://localhost:3000/healthz

# Get Supreme products below retail
curl http://localhost:3000/api/supreme/products
```

---

## 💻 **Option 2: Local Development Setup**

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### Step-by-Step Instructions

**1. Install Dependencies**
```bash
npm install
```

**2. Setup Local PostgreSQL**
```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# On macOS with Homebrew
brew install postgresql
brew services start postgresql

# Create database and user
sudo -u postgres psql
CREATE DATABASE retailradar;
CREATE USER user WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE retailradar TO user;
\q
```

**3. Setup Local Redis**
```bash
# On Ubuntu/Debian
sudo apt install redis-server
sudo systemctl start redis-server

# On macOS with Homebrew  
brew install redis
brew services start redis

# Test Redis
redis-cli ping
```

**4. Configure Environment**
```bash
# The .env file is already configured for local development
cat .env
```

**5. Run Database Migrations**
```bash
npm run db:migrate
```

**6. Start the Application**
```bash
# Development mode with hot reload
npm run dev

# Or build and run production
npm run build
npm start
```

**7. Test the Application**
```bash
# Health check
curl http://localhost:3000/healthz

# Get Supreme products
curl http://localhost:3000/api/supreme/products
```

---

## 🧪 **Testing the PuppeteerAdapter Specifically**

After your infrastructure is running, test the scraping functionality:

**1. Test PuppeteerAdapter directly**
```bash
npx tsx simple-test.ts
```

**2. Test via API endpoint**
```bash
# This will use the PuppeteerAdapter to scrape live data
curl http://localhost:3000/api/supreme/products
```

**3. Check logs for scraping activity**
```bash
# If using Docker
docker-compose logs -f app

# If running locally
# Logs will appear in your terminal
```

---

## 🔧 **Troubleshooting**

**Common Issues:**

1. **Port conflicts**
   ```bash
   # Check what's using ports
   netstat -tlnp | grep :3000
   netstat -tlnp | grep :5432
   netstat -tlnp | grep :6379
   ```

2. **Database connection issues**
   ```bash
   # Test PostgreSQL connection
   psql -h localhost -U user -d retailradar
   ```

3. **Redis connection issues**
   ```bash
   # Test Redis connection
   redis-cli -h localhost -p 6379 ping
   ```

4. **Puppeteer issues in Docker**
   ```bash
   # We now use the official Puppeteer Docker image
   # If issues persist, check container logs
   docker-compose logs app
   
   # For ARM-based systems (Apple M1/M2), you may need:
   docker-compose up --build --platform linux/amd64
   ```

---

### Environment Variables

The `.env` file is pre-configured for local development:

```bash
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/retailradar
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=retailradar
DATABASE_USER=user
DATABASE_PASSWORD=password

# API Keys (optional for basic scraping)
STOCKX_API_KEY=your_official_api_key
RAPIDAPI_KEY=your_rapidapi_key
CAPTCHA_SERVICE=2captcha
CAPTCHA_API_KEY=your_captcha_key

# Application Configuration
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# Cache Configuration
REDIS_URL=redis://localhost:6379
CACHE_TTL=1800
```

## 📊 **API Endpoints**

### Get Supreme Below-Retail Products

```http
GET /api/supreme/products
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Supreme Nike NBA Wristbands (Pack Of 2) Black",
      "belowRetail": "26.67%",
      "retail": "$30",
      "current": "$22",
      "link": "https://stockx.com/supreme-nike-nba-wristbands-red"
    }
  ],
  "timestamp": "2025-06-25T13:00:00Z"
}
```

### Health Check

```http
GET /healthz
```

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "connected",
    "scraper": "operational"
  }
}
```

## 📊 **Expected Results**

Once everything is running, you should see:

1. **Health endpoint** responds with service status
2. **Supreme products API** returns JSON like:
   ```json
   {
     "success": true,
     "data": [
       {
         "name": "Supreme Nike NBA Wristbands (Pack Of 2) Black",
         "belowRetail": "26.67%",
         "retail": "$30",
         "current": "$22", 
         "link": "https://stockx.com/supreme-nike-nba-wristbands-red"
       }
     ]
   }
   ```

3. **Logs showing** successful scraping activity

## Development

### Scripts

```bash
# Development
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:migrate   # Run database migrations

# Testing
npm run test         # Run unit tests
npm run typecheck    # Run TypeScript type checking
npm run lint         # Run ESLint
```

### Project Structure

```
src/
├── adapters/          # Web scraping adapters
│   └── PuppeteerAdapter.ts
├── controllers/       # HTTP request handlers
├── routes/           # API routes
├── services/         # Business logic
├── config/           # Configuration
├── utils/            # Shared utilities
└── types/            # Type definitions
```

## How It Works

1. **Puppeteer Scraping**: Uses stealth techniques to scrape StockX Supreme product pages
2. **Price Analysis**: Estimates retail prices based on Supreme product categories
3. **Below-Retail Detection**: Identifies products selling below estimated retail
4. **JSON API**: Returns structured data for easy consumption
5. **Caching**: Uses Redis to cache results and reduce scraping frequency

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Note**: This tool is for educational purposes. Please respect StockX's terms of service and implement appropriate rate limiting.