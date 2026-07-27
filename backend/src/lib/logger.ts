import { isTest } from '../config/env';

/**
 * Deliberately tiny — docs/02 §1 rules out a logging framework. Silent under test
 * so an intentional 500-path test doesn't spam the reporter.
 */
export const logger = {
  error(message: string, meta?: unknown): void {
    if (isTest) return;
    console.error(`[error] ${message}`, meta ?? '');
  },
  info(message: string): void {
    if (isTest) return;
    console.info(`[info] ${message}`);
  },
};
