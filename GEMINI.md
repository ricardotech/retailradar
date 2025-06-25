
# Gemini Customization for RetailRadar

This file provides context and guidelines for Gemini to effectively assist with the RetailRadar project.

## 1. Project Overview

RetailRadar is a TypeScript-first microservice that extracts Supreme products priced below retail on StockX. It provides a REST API for accessing this data. The primary goal is to deliver a reliable and efficient data feed for developers and analysts.

## 2. Core Technologies

- **Language**: TypeScript 5.0+ (strict mode)
- **Framework**: Express.js 4.18+
- **Web Scraping**: Puppeteer with `puppeteer-extra` and `puppeteer-extra-plugin-stealth`
- **Database**: PostgreSQL 15+ with TypeORM 0.3+
- **Caching**: Redis 7+
- **Validation**: Zod
- **Logging**: Pino (structured JSON)
- **Testing**: Jest (unit, integration), Supertest (E2E)
- **Containerization**: Docker

## 3. Key Architectural Principles

- **Clean Architecture**: Strictly adhere to the separation of concerns between `entities`, `repositories`, `services`, `adapters`, and `controllers`.
- **SOLID Principles**: Ensure all new code follows SOLID principles.
- **Adapter Pattern**: Use the adapter pattern for all external data sources (e.g., `OfficialStockXAdapter`, `RapidApiAdapter`, `PuppeteerAdapter`). All adapters must implement the `IStockXAdapter` interface.
- **Dependency Injection**: Services and repositories should be injected via constructors to facilitate testing and maintainability.

## 4. Development Commands

- `npm run dev`: Start the development server with hot reload.
- `npm run build`: Build the project for production.
- `npm run test`: Run all unit and integration tests.
- `npm run test:e2e`: Run end-to-end tests.
- `npm run lint`: Run ESLint to check for code quality issues.
- `npm run typecheck`: Run the TypeScript compiler to check for type errors.
- `npm run db:migrate`: Apply database migrations.

**When making changes, always run `npm run typecheck`, `npm run lint`, and `npm run test` before submitting.**

## 5. Code Style and Conventions

- **No Comments**: Avoid adding comments to the code unless the logic is unusually complex.
- **TypeScript First**: Use TypeScript's features for type safety. Avoid `any` and use specific types.
- **Error Handling**: Use custom error classes and the `error-handler` middleware.
- **Validation**: Use Zod for all input validation.
- **Logging**: Use the Pino logger for structured, asynchronous logging.
- **Async/Await**: Use `async/await` for all asynchronous operations.

## 6. Testing Strategy

- **Unit Tests**: Test individual functions and classes in isolation. Mock all external dependencies. Place unit tests in `tests/unit`.
- **Integration Tests**: Test the interaction between different parts of the application, such as the service and repository layers. Place integration tests in `tests/integration`.
- **E2E Tests**: Test the application's API endpoints. Use Supertest to make HTTP requests and assert on the responses. Place E2E tests in `tests/e2e`.
- **Test Coverage**: Aim for a test coverage of over 85% for core business logic.

## 7. Commit Message Format

Use a conventional commit message format. For example:

```
feat(scraping): Add Puppeteer adapter for StockX
```

```
fix(api): Correctly handle pagination cursor
```

## 8. Key Files to Reference

- `src/adapters/PuppeteerAdapter.ts`: The primary web scraping logic.
- `src/services/SupremeService.ts`: The core business logic.
- `src/entities/Product.ts`: The main data entity.
- `docker-compose.yml`: The Docker Compose configuration for the full stack.
- `docker-compose.minimal.yml`: A minimal Docker Compose configuration for running just the scraper.
- `README.md`: For setup and usage instructions.
- `product-requirements-document.md`: For the project's requirements and goals.
- `tech-stack.md`: For a detailed overview of the technology stack.
