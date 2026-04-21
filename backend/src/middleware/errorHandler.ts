import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../types';
import logger from '../utils/logger';

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    field?: string;
  };
  stack?: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = { ...err };
  error.message = err.message;

  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if ((err as { code?: number }).code === 11000) {
    const field = Object.keys((err as { keyValue?: Record<string, string> }).keyValue || {})[0];
    const message = `${field ? field.charAt(0).toUpperCase() + field.slice(1) : 'Field'} already exists`;
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const mongooseError = err as mongoose.Error.ValidationError;
    const messages = Object.values(mongooseError.errors).map((val) => val.message);
    const message = messages.join(', ');
    error = new AppError(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new AppError(message, 401);
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    const zodError = err as { errors?: Array<{ message: string; path: (string | number)[] }> };
    const message = zodError.errors?.[0]?.message || 'Validation error';
    error = new AppError(message, 400);
  }

  const response: ErrorResponse = {
    success: false,
    error: {
      message: error.message || 'Server Error',
    },
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status((error as AppError).statusCode || 500).json(response);
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
