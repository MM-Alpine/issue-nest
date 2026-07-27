export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** page/pageSize → Prisma skip/take. Bounds are enforced by Zod before this runs. */
export function toSkipTake(page: number, pageSize: number): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

/**
 * A page past the end is not an error: it returns an empty array with honest meta
 * (docs/04 §10). `totalPages` is 0 when there are no rows at all.
 */
export function buildMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return { page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}
