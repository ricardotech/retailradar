import { Request, Response, NextFunction } from 'express';
import { BrandService } from '@/services/BrandService';
import { BrandProductsQuery, ApiResponse, PaginatedResponse, Product } from '@/types';

export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  async getBelowRetailProducts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const brandName = req.params['brandName'];
      if (!brandName) {
        throw new Error('Brand name is required');
      }
      const query = req.query as unknown as BrandProductsQuery;
      const result = await this.brandService.getBrandBelowRetail(brandName, query);

      const response: ApiResponse<PaginatedResponse<Product>> = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getAdapterStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const brandName = req.params['brandName'];
      if (!brandName) {
        throw new Error('Brand name is required');
      }
      const stats = await this.brandService.getAdapterStats(brandName);
      
      const response: ApiResponse<any> = {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getHealthStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const brandName = req.params['brandName'];
      if (!brandName) {
        throw new Error('Brand name is required');
      }
      const health = await this.brandService.getHealthStatus(brandName);
      
      const response: ApiResponse<unknown> = {
        success: true,
        data: health,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async resetCircuitBreakers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const brandName = req.params['brandName'];
      if (!brandName) {
        throw new Error('Brand name is required');
      }
      this.brandService.resetCircuitBreakers(brandName);
      
      const response: ApiResponse<unknown> = {
        success: true,
        data: { message: `All circuit breakers have been reset for ${brandName}` },
        timestamp: new Date().toISOString(),
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}