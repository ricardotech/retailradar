import { Request, Response, NextFunction } from 'express';
import { SupremeService } from '@/services/SupremeService';
import { SupremeProductsQuery, ApiResponse, PaginatedResponse, Product } from '@/types';

export class SupremeController {
  constructor(private readonly supremeService: SupremeService) {}

  async getBelowRetailProducts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = req.query as unknown as SupremeProductsQuery;
      const result = await this.supremeService.getSupremeBelowRetail(query);

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
}