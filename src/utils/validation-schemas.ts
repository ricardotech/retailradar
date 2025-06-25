import { z } from 'zod';

export const SupremeProductsQuerySchema = z.object({
  minDiscount: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .refine((val) => val === undefined || (val >= 0 && val <= 1), {
      message: 'minDiscount must be between 0 and 1',
    }),
  maxPrice: z
    .string()
    .optional()
    .transform((val) => (val ? parseFloat(val) : undefined))
    .refine((val) => val === undefined || val > 0, {
      message: 'maxPrice must be greater than 0',
    }),
  size: z.string().optional(),
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => val >= 1 && val <= 100, {
      message: 'limit must be between 1 and 100',
    }),
});

export const ProductIdSchema = z.object({
  id: z.string().uuid({
    message: 'Product ID must be a valid UUID',
  }),
});

export const PaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => val >= 1 && val <= 100, {
      message: 'limit must be between 1 and 100',
    }),
});

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.string().datetime(),
  services: z.record(z.object({
    status: z.enum(['up', 'down']),
    responseTime: z.number().optional(),
  })),
});