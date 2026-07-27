import { describe, expect, it } from 'vitest';
import { buildMeta, toSkipTake } from '../../src/shared/pagination';

describe('toSkipTake', () => {
  it('maps page 1 to no offset', () => {
    expect(toSkipTake(1, 20)).toEqual({ skip: 0, take: 20 });
  });

  it('maps page 3 with pageSize 20 to skip 40', () => {
    expect(toSkipTake(3, 20)).toEqual({ skip: 40, take: 20 });
  });

  it('respects a non-default page size', () => {
    expect(toSkipTake(2, 5)).toEqual({ skip: 5, take: 5 });
  });
});

describe('buildMeta', () => {
  it('rounds totalPages up for a partial last page', () => {
    expect(buildMeta(1, 20, 24)).toEqual({ page: 1, pageSize: 20, total: 24, totalPages: 2 });
  });

  it('reports exactly one page when the total fills it', () => {
    expect(buildMeta(1, 20, 20).totalPages).toBe(1);
  });

  it('reports zero pages for an empty result set', () => {
    expect(buildMeta(1, 20, 0)).toEqual({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  });

  it('keeps meta honest for a page past the end', () => {
    expect(buildMeta(9, 20, 24)).toEqual({ page: 9, pageSize: 20, total: 24, totalPages: 2 });
  });
});
