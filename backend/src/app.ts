import cors from 'cors';
import express, { Router, type Express } from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { authRouter, meRouter } from './modules/auth/auth.routes';
import { healthRouter } from './modules/health/health.routes';
import { projectsRouter } from './modules/projects/projects.routes';

/**
 * Builds the Express application WITHOUT calling listen(), which is what lets
 * Supertest drive the real app in-process (docs/02 §3).
 *
 * Pipeline: cors → express.json → router → authenticate → validate → controller
 *           → service → errorHandler
 */
export function buildApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: false }));
  app.use(express.json({ limit: '1mb' }));

  const api = Router();
  api.use('/health', healthRouter);
  api.use('/auth', authRouter);
  api.use('/me', meRouter);
  api.use('/projects', projectsRouter);

  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
