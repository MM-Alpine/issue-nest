import { IssuePriority, IssueStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { buildIssueOrderBy, buildIssueWhere } from '../../src/modules/issues/issues.query';

const PROJECT = 'cprojectxxxxxxxxxxxxxxxxx';
const USER = 'cuserxxxxxxxxxxxxxxxxxxxxx';

describe('buildIssueWhere', () => {
  it('always scopes to the project', () => {
    expect(buildIssueWhere(PROJECT, {})).toEqual({ projectId: PROJECT });
  });

  it('maps q to a case-insensitive title contains', () => {
    expect(buildIssueWhere(PROJECT, { q: 'login' })).toEqual({
      projectId: PROJECT,
      title: { contains: 'login', mode: 'insensitive' },
    });
  });

  it('maps status and priority straight through', () => {
    expect(
      buildIssueWhere(PROJECT, { status: IssueStatus.OPEN, priority: IssuePriority.HIGH }),
    ).toEqual({ projectId: PROJECT, status: 'OPEN', priority: 'HIGH' });
  });

  it('maps an assignee id to assigneeId', () => {
    expect(buildIssueWhere(PROJECT, { assignee: USER })).toEqual({
      projectId: PROJECT,
      assigneeId: USER,
    });
  });

  it('maps assignee=unassigned to assigneeId null', () => {
    expect(buildIssueWhere(PROJECT, { assignee: 'unassigned' })).toEqual({
      projectId: PROJECT,
      assigneeId: null,
    });
  });

  it('AND-combines every filter into one where object', () => {
    expect(
      buildIssueWhere(PROJECT, {
        q: 'cache',
        status: IssueStatus.CLOSED,
        priority: IssuePriority.LOW,
        assignee: USER,
      }),
    ).toEqual({
      projectId: PROJECT,
      title: { contains: 'cache', mode: 'insensitive' },
      status: 'CLOSED',
      priority: 'LOW',
      assigneeId: USER,
    });
  });

  it('ignores an empty search string', () => {
    expect(buildIssueWhere(PROJECT, { q: '' })).toEqual({ projectId: PROJECT });
  });
});

describe('buildIssueOrderBy', () => {
  it('sorts by the requested field with an id tiebreaker for stable pagination', () => {
    expect(buildIssueOrderBy('createdAt', 'desc')).toEqual([
      { createdAt: 'desc' },
      { id: 'desc' },
    ]);
  });

  it('supports semantic priority sorting', () => {
    expect(buildIssueOrderBy('priority', 'asc')).toEqual([{ priority: 'asc' }, { id: 'desc' }]);
  });

  it('supports status sorting', () => {
    expect(buildIssueOrderBy('status', 'desc')).toEqual([{ status: 'desc' }, { id: 'desc' }]);
  });
});
