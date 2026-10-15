import { env } from '../config/env.js';

export function errorMiddleware(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isProd = env.NODE_ENV === 'production';

  // Log error without exposing sensitive headers/tokens
  const logDetails = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message,
  };

  if (!err.isOperational || statusCode >= 500) {
    console.error('[UNHANDLED_ERROR]', JSON.stringify(logDetails), err.stack);
  } else {
    console.warn('[OPERATIONAL_ERROR]', JSON.stringify(logDetails));
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      details: err.details || null,
      requestId: req.id,
      ...(isProd ? {} : { stack: err.stack }),
    },
  });
}
