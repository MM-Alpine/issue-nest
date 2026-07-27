import { PrismaClient } from '@prisma/client';
import { isProduction, isTest } from '../config/env';

/**
 * One shared Prisma Client for the whole process (docs/02 §2).
 * Cached on globalThis so `tsx watch` reloads don't exhaust the connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Silent under test: constraint violations are asserted behaviour there, not noise.
    log: isTest ? [] : ['warn', 'error'],
  });

if (!isProduction) globalForPrisma.prisma = prisma;
