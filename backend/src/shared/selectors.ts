/**
 * The ONLY shape a User is ever exposed in. There is no `select: *` on User anywhere,
 * which is what guarantees `passwordHash` cannot leak (docs/02 §10, INVARIANTS #6).
 */
export const publicUserSelect = { id: true, name: true, email: true } as const;

export type PublicUser = { id: string; name: string; email: string };
