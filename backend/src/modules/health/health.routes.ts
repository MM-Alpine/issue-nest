import { Router } from 'express';
import { asyncHandler } from '../../lib/async-handler';
import { serviceUnavailable } from '../../lib/errors';
import { prisma } from '../../lib/prisma';

export const healthRouter = Router();

/** Liveness + a real database ping, so a reviewer can check both before opening the UI. */
healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      throw serviceUnavailable('Database is unreachable');
    }
    res.status(200).json({ status: 'ok', database: 'up' });
  }),
);
