import { IssuePriority, IssueStatus, PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

/**
 * Demo data for reviewers (docs/05 §2.9). Idempotent: every write is an upsert keyed
 * on a unique column, so `npm run db:seed` can be re-run safely.
 *
 * These are fixtures, not secrets — the password is documented in the README.
 */
const prisma = new PrismaClient();

const DEMO_PASSWORD = 'password123';
const DEMO_USER_KEY: UserKey = 'asha';

type UserKey = 'asha' | 'ravi' | 'maya' | 'daniel';
type ProjectKey = 'FUS' | 'AINT' | 'CAM';

const USERS: Array<{
  key: UserKey;
  name: string;
  email: string;
  legacyEmails: string[];
}> = [
  { key: 'asha', name: 'Asha Kumar', email: 'asha.kumar@fuser.dev', legacyEmails: ['asha@example.com'] },
  { key: 'ravi', name: 'Ravi Menon', email: 'ravi.menon@fuser.dev', legacyEmails: ['ravi@example.com'] },
  { key: 'maya', name: 'Maya Iyer', email: 'maya.iyer@alpineintellect.ai', legacyEmails: ['mei@example.com'] },
  { key: 'daniel', name: 'Daniel Park', email: 'daniel.park@alpineintellect.ai', legacyEmails: [] },
];

const PROJECTS: Array<{
  key: ProjectKey;
  legacyKeys: string[];
  name: string;
  description: string;
}> = [
  {
    key: 'FUS',
    legacyKeys: ['WEB'],
    name: 'Fuser',
    description: 'Customer engagement workflows, workspace access, and account operations.',
  },
  {
    key: 'AINT',
    legacyKeys: ['API'],
    name: 'Alpine Intellect',
    description: 'AI research workspace for knowledge sync, citations, and usage insights.',
  },
  {
    key: 'CAM',
    legacyKeys: ['CAMPAIGN'],
    name: 'Alpine-GTM',
    description: 'Campaign planning, launch approvals, audience sync, and reporting.',
  },
];

/** Staggered days-ago values so sorting and pagination are visibly meaningful. */
const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

type IssueSeed = {
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  reporter: UserKey;
  assignee: UserKey | null;
  age: number;
};

const FUSER_ISSUES: IssueSeed[] = [
  { title: 'SSO login issue', description: 'Okta users complete MFA but land back on the sign-in screen.', status: IssueStatus.OPEN, priority: IssuePriority.HIGH, reporter: 'asha', assignee: 'ravi', age: 1 },
  { title: 'Workspace invite email not delivered', description: 'Invites sent from the members drawer are accepted by the API but never reach SendGrid.', status: IssueStatus.IN_PROGRESS, priority: IssuePriority.CRITICAL, reporter: 'ravi', assignee: 'asha', age: 2 },
  { title: 'Billing plan badge shows stale seat count', description: 'The plan summary keeps the previous seat count until a hard refresh.', status: IssueStatus.OPEN, priority: IssuePriority.MEDIUM, reporter: 'maya', assignee: null, age: 4 },
  { title: 'Slack handoff creates duplicate tickets', description: 'A retry from Slack creates a second issue instead of updating the original.', status: IssueStatus.OPEN, priority: IssuePriority.HIGH, reporter: 'ravi', assignee: 'ravi', age: 5 },
  { title: 'Saved filters reset after refresh', description: 'The URL keeps the filters, but the controls render their default values.', status: IssueStatus.RESOLVED, priority: IssuePriority.MEDIUM, reporter: 'asha', assignee: 'asha', age: 8 },
  { title: 'Customer profile drawer clips activity feed', description: 'The right panel cannot scroll to the final event on small laptops.', status: IssueStatus.OPEN, priority: IssuePriority.LOW, reporter: 'maya', assignee: 'ravi', age: 9 },
  { title: 'CSV contact import accepts blank company names', description: 'Rows with only an email address pass validation and later fail enrichment.', status: IssueStatus.CLOSED, priority: IssuePriority.LOW, reporter: 'ravi', assignee: null, age: 14 },
  { title: 'Audit export times out for large workspaces', description: 'Exports over 10k events consistently hit the gateway timeout.', status: IssueStatus.IN_PROGRESS, priority: IssuePriority.CRITICAL, reporter: 'asha', assignee: 'ravi', age: 3 },
];

const ALPINE_INTELLECT_ISSUES: IssueSeed[] = [
  { title: 'Knowledge sync stalls on large Notion spaces', description: 'Workspaces above 1,500 pages remain in syncing state for hours.', status: IssueStatus.IN_PROGRESS, priority: IssuePriority.CRITICAL, reporter: 'maya', assignee: 'daniel', age: 1 },
  { title: 'Citations point to archived documents', description: 'Answer cards still reference sources removed from the active collection.', status: IssueStatus.OPEN, priority: IssuePriority.HIGH, reporter: 'asha', assignee: 'maya', age: 2 },
  { title: 'Prompt template editor loses unsaved changes', description: 'Switching tabs clears the draft without a browser warning.', status: IssueStatus.OPEN, priority: IssuePriority.MEDIUM, reporter: 'daniel', assignee: null, age: 5 },
  { title: 'Usage dashboard totals shift by timezone', description: 'Daily token totals differ between UTC and account-local views.', status: IssueStatus.RESOLVED, priority: IssuePriority.HIGH, reporter: 'maya', assignee: 'asha', age: 7 },
  { title: 'Source access not applied in preview answers', description: 'Preview mode can cite a restricted source before the answer is published.', status: IssueStatus.OPEN, priority: IssuePriority.CRITICAL, reporter: 'asha', assignee: 'daniel', age: 3 },
  { title: 'Weekly insight email renders an empty chart', description: 'Accounts with no queries in the previous week get a blank chart container.', status: IssueStatus.CLOSED, priority: IssuePriority.LOW, reporter: 'maya', assignee: 'maya', age: 15 },
  { title: 'Vector refresh does not retry failed files', description: 'A transient S3 read error leaves the file permanently marked failed.', status: IssueStatus.IN_PROGRESS, priority: IssuePriority.MEDIUM, reporter: 'daniel', assignee: 'daniel', age: 6 },
  { title: 'Search relevance drops for short acronyms', description: 'Queries like ARR and SSO return broad semantic matches before exact hits.', status: IssueStatus.OPEN, priority: IssuePriority.MEDIUM, reporter: 'maya', assignee: null, age: 10 },
];

const CAMPAIGN_ISSUES: IssueSeed[] = [
  { title: 'Campaign launch checklist not saving owner', description: 'Changing the owner appears to save, but the old value returns after reload.', status: IssueStatus.OPEN, priority: IssuePriority.HIGH, reporter: 'ravi', assignee: 'asha', age: 1 },
  { title: 'LinkedIn audience size shows zero after import', description: 'CSV import succeeds but the imported audience summary displays zero contacts.', status: IssueStatus.IN_PROGRESS, priority: IssuePriority.CRITICAL, reporter: 'asha', assignee: 'ravi', age: 2 },
  { title: 'UTM builder duplicates source parameter', description: 'Generated links include two utm_source parameters when cloned from a template.', status: IssueStatus.OPEN, priority: IssuePriority.MEDIUM, reporter: 'maya', assignee: null, age: 4 },
  { title: 'Approval reminder fires after campaign archived', description: 'The reminder job does not filter archived campaign records.', status: IssueStatus.OPEN, priority: IssuePriority.HIGH, reporter: 'daniel', assignee: 'maya', age: 6 },
  { title: 'Budget pacing card uses wrong currency', description: 'EUR campaigns render pacing totals with the USD symbol.', status: IssueStatus.RESOLVED, priority: IssuePriority.MEDIUM, reporter: 'ravi', assignee: 'asha', age: 8 },
  { title: 'Asset review comments disappear after refresh', description: 'New review comments save but are missing from the refreshed asset detail view.', status: IssueStatus.IN_PROGRESS, priority: IssuePriority.HIGH, reporter: 'asha', assignee: 'daniel', age: 3 },
  { title: 'Experiment status stuck in draft', description: 'A landing-page experiment remains draft after the publish endpoint returns 200.', status: IssueStatus.CLOSED, priority: IssuePriority.LOW, reporter: 'maya', assignee: 'ravi', age: 18 },
  { title: 'Segment sync skips uppercase email addresses', description: 'Contacts with uppercase characters in email are dropped before normalization.', status: IssueStatus.OPEN, priority: IssuePriority.CRITICAL, reporter: 'ravi', assignee: 'daniel', age: 5 },
];

const ISSUE_SEEDS: Record<ProjectKey, IssueSeed[]> = {
  FUS: FUSER_ISSUES,
  AINT: ALPINE_INTELLECT_ISSUES,
  CAM: CAMPAIGN_ISSUES,
};

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users: Record<UserKey, string> = {} as Record<UserKey, string>;
  for (const user of USERS) {
    const existing = await prisma.user.findFirst({
      where: { email: { in: [user.email, ...user.legacyEmails] } },
      select: { id: true },
    });

    const record = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: { name: user.name, email: user.email, passwordHash },
          select: { id: true },
        })
      : await prisma.user.create({
          data: { name: user.name, email: user.email, passwordHash },
          select: { id: true },
        });
    users[user.key] = record.id;
  }

  const projects: Record<ProjectKey, string> = {} as Record<ProjectKey, string>;
  for (const project of PROJECTS) {
    const existing =
      (await prisma.project.findUnique({ where: { key: project.key }, select: { id: true } })) ??
      (await prisma.project.findFirst({
        where: { key: { in: project.legacyKeys } },
        select: { id: true },
      }));

    const record = existing
      ? await prisma.project.update({
          where: { id: existing.id },
          data: { key: project.key, name: project.name, description: project.description },
          select: { id: true },
        })
      : await prisma.project.create({
          data: { key: project.key, name: project.name, description: project.description },
          select: { id: true },
        });

    if (project.legacyKeys.length > 0) {
      await prisma.project.deleteMany({
        where: { key: { in: project.legacyKeys }, id: { not: record.id } },
      });
    }

    projects[project.key] = record.id;
  }

  const memberships: [ProjectKey, UserKey, Role][] = [
    ['FUS', 'asha', Role.MAINTAINER],
    ['FUS', 'ravi', Role.MAINTAINER],
    ['FUS', 'maya', Role.MEMBER],
    ['AINT', 'asha', Role.MAINTAINER],
    ['AINT', 'maya', Role.MAINTAINER],
    ['AINT', 'daniel', Role.MEMBER],
    ['CAM', 'asha', Role.MAINTAINER],
    ['CAM', 'ravi', Role.MEMBER],
    ['CAM', 'maya', Role.MEMBER],
    ['CAM', 'daniel', Role.MAINTAINER],
  ];
  for (const [projectKey, userKey, role] of memberships) {
    const projectId = projects[projectKey] as string;
    const userId = users[userKey] as string;
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      update: { role },
      create: { projectId, userId, role },
    });
  }

  const hasMembership = (projectKey: ProjectKey, userKey: UserKey): boolean =>
    memberships.some(([memberProjectKey, memberUserKey]) => (
      memberProjectKey === projectKey && memberUserKey === userKey
    ));

  const assertSeedIssueMembership = (projectKey: ProjectKey, seed: IssueSeed): void => {
    if (!hasMembership(projectKey, seed.reporter)) {
      throw new Error(`Seed issue "${seed.title}" reporter is not a ${projectKey} member`);
    }
    if (seed.assignee && !hasMembership(projectKey, seed.assignee)) {
      throw new Error(`Seed issue "${seed.title}" assignee is not a ${projectKey} member`);
    }
  };

  // Issues have no natural unique key, so re-seeding replaces this project's issues
  // wholesale rather than accumulating duplicates. Comments cascade with them.
  //
  // Delete + recreate runs in ONE transaction: an interrupted seed (Ctrl-C, dropped
  // connection) must roll back to the previous issue set rather than leave a reviewer
  // with a silently half-populated project.
  const seedIssues = async (projectKey: ProjectKey, seeds: IssueSeed[]): Promise<string[]> => {
    const projectId = projects[projectKey] as string;

    return prisma.$transaction(async (tx) => {
      await tx.issue.deleteMany({ where: { projectId } });

      const ids: string[] = [];
      for (const seed of seeds) {
        assertSeedIssueMembership(projectKey, seed);
        const created = await tx.issue.create({
          data: {
            projectId,
            title: seed.title,
            description: seed.description,
            status: seed.status,
            priority: seed.priority,
            reporterId: users[seed.reporter] as string,
            assigneeId: seed.assignee ? (users[seed.assignee] as string) : null,
            createdAt: daysAgo(seed.age),
          },
          select: { id: true },
        });
        ids.push(created.id);
      }
      return ids;
      // Prisma's 5s default is comfortable locally but not when seeding a hosted
      // database over a public proxy, where each statement pays real round-trip
      // latency. Generous ceilings keep the all-or-nothing guarantee above intact
      // instead of trading it for speed.
    }, { maxWait: 15_000, timeout: 120_000 });
  };

  const issueIds: Record<ProjectKey, string[]> = {} as Record<ProjectKey, string[]>;
  for (const project of PROJECTS) {
    issueIds[project.key] = await seedIssues(project.key, ISSUE_SEEDS[project.key]);
  }

  const threads: [string, [UserKey, string][]][] = [
    [
      issueIds.FUS[0] as string,
      [
        ['asha', 'This is blocking the enterprise pilot workspace.'],
        ['ravi', 'Confirmed in Okta preview and production tenants.'],
        ['asha', 'Please verify after the callback URL change lands.'],
      ],
    ],
    [
      issueIds.FUS[1] as string,
      [
        ['ravi', 'The API returns 202, but SendGrid does not show a matching event.'],
        ['asha', 'Checking whether the invite template id changed in production.'],
      ],
    ],
    [
      issueIds.AINT[0] as string,
      [
        ['maya', 'Largest impacted workspace has 2,300 pages.'],
        ['daniel', 'Batch size is too high for the current worker memory limit.'],
      ],
    ],
    [
      issueIds.AINT[4] as string,
      [
        ['asha', 'This must be fixed before the customer security review.'],
        ['daniel', 'Adding an authorization check before preview answer assembly.'],
      ],
    ],
    [
      issueIds.CAM[1] as string,
      [
        ['ravi', 'The import summary payload has the right count, so this looks frontend-side.'],
        ['asha', 'Please compare the uploaded audience id with the selected campaign id.'],
      ],
    ],
  ];

  for (const [issueId, comments] of threads) {
    for (const [authorKey, body] of comments) {
      await prisma.comment.create({
        data: { issueId, authorId: users[authorKey] as string, body },
      });
    }
  }

  const [userCount, projectCount, issueCount, commentCount] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.issue.count(),
    prisma.comment.count(),
  ]);

  console.info(
    `Seeded ${userCount} users, ${projectCount} projects, ${issueCount} issues, ${commentCount} comments.`,
  );
  const demoUser = USERS.find((user) => user.key === DEMO_USER_KEY);
  if (!demoUser) throw new Error('Demo user is not configured');
  console.info(`Demo login: ${demoUser.email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
