import { Role } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/lib/errors';
import { assertCanUpdateIssue } from '../../src/shared/permissions';

const REPORTER = 'creporterxxxxxxxxxxxxxxxx';
const OTHER = 'cotherxxxxxxxxxxxxxxxxxxxx';

const issue = { reporterId: REPORTER };
const maintainer = { userId: OTHER, role: Role.MAINTAINER };
const reporterMember = { userId: REPORTER, role: Role.MEMBER };
const otherMember = { userId: OTHER, role: Role.MEMBER };

const expectForbidden = (fn: () => void): void => {
  try {
    fn();
    throw new Error('expected assertCanUpdateIssue to throw');
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).status).toBe(403);
    expect((error as AppError).code).toBe('FORBIDDEN');
  }
};

describe('assertCanUpdateIssue — role × field × ownership', () => {
  describe('MAINTAINER', () => {
    for (const field of ['title', 'description', 'priority', 'status', 'assigneeId']) {
      it(`allows a maintainer to change ${field}`, () => {
        expect(() => assertCanUpdateIssue(issue, maintainer, [field])).not.toThrow();
      });
    }

    it('allows a maintainer to change every field at once', () => {
      expect(() =>
        assertCanUpdateIssue(issue, maintainer, [
          'title',
          'description',
          'priority',
          'status',
          'assigneeId',
        ]),
      ).not.toThrow();
    });
  });

  describe('MEMBER who reported the issue', () => {
    for (const field of ['title', 'description', 'priority']) {
      it(`allows the reporter to change ${field}`, () => {
        expect(() => assertCanUpdateIssue(issue, reporterMember, [field])).not.toThrow();
      });
    }

    it('forbids the reporter from changing status', () => {
      expectForbidden(() => assertCanUpdateIssue(issue, reporterMember, ['status']));
    });

    it('forbids the reporter from changing assigneeId', () => {
      expectForbidden(() => assertCanUpdateIssue(issue, reporterMember, ['assigneeId']));
    });

    it('forbids a mixed patch that includes a maintainer-only field', () => {
      expectForbidden(() => assertCanUpdateIssue(issue, reporterMember, ['title', 'status']));
    });
  });

  describe('MEMBER who did not report the issue', () => {
    for (const field of ['title', 'description', 'priority', 'status', 'assigneeId']) {
      it(`forbids changing ${field}`, () => {
        expectForbidden(() => assertCanUpdateIssue(issue, otherMember, [field]));
      });
    }
  });

  it('names the offending field in the message', () => {
    try {
      assertCanUpdateIssue(issue, reporterMember, ['status']);
    } catch (error) {
      expect((error as AppError).message).toMatch(/maintainers can change issue status/i);
    }
  });
});
