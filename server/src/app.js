import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/request-id.middleware.js';
import { notFoundMiddleware } from './middleware/not-found.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  // Security & CORS
  const configuredOrigins = [
    ...env.CORS_ORIGIN.split(','),
    env.CLIENT_ORIGIN,
  ].map((o) => o?.trim()).filter(Boolean);
  const allowedOrigins = Array.from(new Set(configuredOrigins));

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, server-to-server)
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    })
  );

  // Cookie parsing for HTTP-only JWT cookies
  app.use(cookieParser());

  // Request parsing with body size limit (1MB max to mitigate memory exhaustion)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request ID
  app.use(requestIdMiddleware);

  // Minimal non-leaking access logger
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      // Never log query tokens or headers containing auth
      console.log(`[HTTP] ${req.id.slice(0, 8)} ${req.method} ${req.baseUrl}${req.path} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  // Root welcome
  app.get('/', (req, res) => {
    res.json({
      name: 'OpenOrbit API',
      version: '1.0.0',
      description: 'AI-Powered Open-Source Contribution Assistant',
      docs: '/api/health',
    });
  });

  // Mount API routes under /api
  app.use('/api', apiRoutes);

  // Handle 404s
  app.use(notFoundMiddleware);

  // Centralized Error Handler
  app.use(errorMiddleware);

  return app;
}
