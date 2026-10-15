import { randomUUID } from 'crypto';

/**
 * Middleware that assigns a unique request ID to each incoming request
 */
export function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
