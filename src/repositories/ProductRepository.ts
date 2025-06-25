import { Repository, DataSource as TypeORMDataSource, SelectQueryBuilder } from 'typeorm';
import { Product } from '@/entities/Product';
import { BrandProductsQuery } from '@/types';

export class ProductRepository {
  private repository: Repository<Product>;

  constructor(dataSource: TypeORMDataSource) {
    this.repository = dataSource.getRepository(Product);
  }

  async findBelowRetailProducts(
    brandName: string,
    query: BrandProductsQuery
  ): Promise<Product[]> {
    const queryBuilder = this.repository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.prices', 'price')
      .where('product.currentPrice < product.retailPrice')
      .andWhere('product.brand = :brand', { brand: brandName });

    this.applyFilters(queryBuilder, query);
    this.applySorting(queryBuilder);
    this.applyPagination(queryBuilder, query);

    return queryBuilder.getMany();
  }

  async countBelowRetailProducts(
    brandName: string,
    query: Omit<BrandProductsQuery, 'cursor' | 'limit'>
  ): Promise<number> {
    const queryBuilder = this.repository
      .createQueryBuilder('product')
      .where('product.currentPrice < product.retailPrice')
      .andWhere('product.brand = :brand', { brand: brandName });

    this.applyFilters(queryBuilder, query);

    return queryBuilder.getCount();
  }

  async findById(id: string): Promise<Product | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['prices'],
    });
  }

  async findByStockxUrl(stockxUrl: string): Promise<Product | null> {
    return this.repository.findOne({
      where: { stockxUrl },
      relations: ['prices'],
    });
  }

  async save(product: Product): Promise<Product> {
    return this.repository.save(product);
  }

  async saveMany(products: Product[]): Promise<Product[]> {
    return this.repository.save(products);
  }

  async update(id: string, updates: Partial<Product>): Promise<void> {
    await this.repository.update(id, updates);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<Product>,
    query: BrandProductsQuery
  ): void {
    if (query.minDiscount !== undefined) {
      queryBuilder.andWhere('product.discountPercentage >= :minDiscount', {
        minDiscount: query.minDiscount,
      });
    }

    if (query.maxPrice !== undefined) {
      queryBuilder.andWhere('product.currentPrice <= :maxPrice', {
        maxPrice: query.maxPrice,
      });
    }

    if (query.size) {
      queryBuilder.andWhere('product.size = :size', { size: query.size });
    }
  }

  private applySorting(queryBuilder: SelectQueryBuilder<Product>): void {
    queryBuilder.orderBy('product.discountPercentage', 'DESC');
    queryBuilder.addOrderBy('product.createdAt', 'DESC');
  }

  private applyPagination(
    queryBuilder: SelectQueryBuilder<Product>,
    query: BrandProductsQuery
  ): void {
    const limit = query.limit || 20;
    queryBuilder.limit(limit);

    if (query.cursor) {
      try {
        const decodedCursor = Buffer.from(query.cursor, 'base64').toString();
        const [discountPercentage, createdAt] = decodedCursor.split('|');
        
        if (discountPercentage && createdAt) {
          queryBuilder.andWhere(
            '(product.discountPercentage < :discountPercentage OR (product.discountPercentage = :discountPercentage AND product.createdAt < :createdAt))',
            {
              discountPercentage: parseFloat(discountPercentage),
              createdAt: new Date(createdAt),
            }
          );
        }
      } catch (error) {
        // Invalid cursor, ignore
      }
    }
  }

  generateCursor(product: Product): string {
    const cursorData = `${product.discountPercentage}|${product.createdAt.toISOString()}`;
    return Buffer.from(cursorData).toString('base64');
  }
}