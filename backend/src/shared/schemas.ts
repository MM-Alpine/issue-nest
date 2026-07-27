import { z } from 'zod';

/**
 * Ids are CUIDs (docs/01 A18). Validating the shape means a malformed id yields a
 * 400 without a database round trip (docs/02 §7).
 */
export const cuidSchema = z.string().regex(/^c[a-z0-9]{20,}$/i, 'Invalid id');

export const ProjectIdParams = z.object({ projectId: cuidSchema });
export type ProjectIdParams = z.infer<typeof ProjectIdParams>;

export const IssueIdParams = z.object({ issueId: cuidSchema });
export type IssueIdParams = z.infer<typeof IssueIdParams>;
