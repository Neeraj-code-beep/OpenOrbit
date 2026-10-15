import { AppError } from '../utils/app-error.js';

export function notFoundMiddleware(req, res, next) {
  next(new AppError(`Endpoint not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}
