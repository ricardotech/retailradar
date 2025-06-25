import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from './error-handler';

export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedQuery = schema.parse(req.query);
      req.query = validatedQuery;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        next(new ValidationError(`Invalid query parameters: ${message}`));
      } else {
        next(error);
      }
    }
  };
};

export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedBody = schema.parse(req.body);
      req.body = validatedBody;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        next(new ValidationError(`Invalid request body: ${message}`));
      } else {
        next(error);
      }
    }
  };
};

export const validateParams = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedParams: unknown = schema.parse(req.params);
      req.params = validatedParams as Record<string, unknown>;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        next(new ValidationError(`Invalid path parameters: ${message}`));
      } else {
        next(error);
      }
    }
  };
};