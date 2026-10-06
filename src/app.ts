import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/env';
import { checkDatabaseReady } from './config/database';
import { internalAuthMiddleware } from './middleware/internalAuth';
import { tenantContextMiddleware } from './middleware/context';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import pageCategoryRoutes from './modules/page-category/routes';

export function createApp(): Express {
  const app = express();

  // Security headers & CORS
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (
          !origin ||
          config.cors.allowedOrigins.includes('*') ||
          config.cors.allowedOrigins.includes(origin)
        ) {
          callback(null, true);
        } else {
          callback(new Error('Blocked by CORS policy'));
        }
      },
      credentials: true,
    })
  );

  // Body parsers
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Unauthenticated health & readiness probes
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'page-category-service',
    });
  });

  app.get('/ready', async (req: Request, res: Response) => {
    const isDbReady = await checkDatabaseReady();
    if (isDbReady) {
      res.status(200).json({
        success: true,
        status: 'READY',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        success: false,
        status: 'NOT_READY',
        database: 'DISCONNECTED',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Protected API routes
  app.use(
    '/api/v1/page-categories',
    internalAuthMiddleware,
    tenantContextMiddleware,
    pageCategoryRoutes
  );

  // 404 handler
  app.use(notFoundHandler);

  // Global structured error handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
