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

const USERS = [
  { name: 'Asha Kumar', email: 'asha@example.com' },
  { name: 'Ravi Menon', email: 'ravi@example.com' },
  { name: 'Mei Chen', email: 'mei@example.com' },
] as const;

const PROJECTS = [
  { key: 'WEB', name: 'Website Redesign', description: 'Marketing site rebuild for Q3.' },
  { key: 'API', name: 'Public API', description: 'v2 rollout and developer docs.' },
] as const;

/** Staggered days-ago values so sorting and pagination are visibly meaningful. */
const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

type IssueSeed = {
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  reporter: 'asha' | 'ravi' | 'mei';
  assignee: 'asha' | 'ravi' | 'mei' | null;
  age: number;
};

const WEB_ISSUES: IssueSeed[] = [
  { title: 'Login button unresponsive on iOS', description: 'Tapping Log in on iOS Safari does nothing. Console shows a swallowed promise rejection.', status: IssueStatus.IN_PROGRESS, priority: IssuePriority.HIGH, reporter: 'ravi', assignee: 'asha', age: 2 },
  { title: 'Footer links return 404', description: 'All footer links point at the old CMS paths.', status: IssueStatus.OPEN, priority: IssuePriority.LOW, reporter: 'ravi', assignee: null, age: 5 },
  { title: 'Hero image is not responsive below 360px', description: 'The hero overflows horizontally on small phones.', status: IssueStatus.OPEN, priority: IssuePriority.MEDIUM, reporter: 'asha', assignee: 'ravi', age: 7 },
  { title: 'Contact form silently drops submissions', description: 'No error surfaces when the mail provider rejects the request.', status: IssueStatus.OPEN, priority: IssuePriority.CRITICAL, reporter: 'ravi', assignee: 'asha', age: 1 },
  { title: 'Cookie banner reappears after acceptance', description: null, status: IssueStatus.RESOLVED, priority: IssuePriority.MEDIUM, reporter: 'asha', assignee: 'asha', age: 12 },
  { title: 'Search returns duplicate results', description: 'Pagination repeats rows when two items share a timestamp.', status: IssueStatus.IN_PROGRESS, priority: IssuePriority.HIGH, reporter: 'asha', assignee: 'ravi', age: 3 },
  { title: 'Blog index sorts oldest first', description: null, status: IssueStatus.CLOSED, priority: IssuePriority.LOW, reporter: 'ravi', assignee: null, age: 20 },
  { title: 'Broken favicon on Safari', description: null, status: IssueStatus.OPEN, priority: IssuePriority.LOW, reporter: 'asha', assignee: null, age: 9 },
  { title: 'Newsletter signup accepts invalid emails', description: 'Client-side validation is missing entirely.', status: IssueStatus.OPEN, priority: IssuePriority.MEDIUM, reporter: 'ravi', assignee: 'ravi', age: 4 },
  { title: 'Pricing table misaligned on tablet', description: null, status: IssueStatus.RESOLVED, priority: IssuePriority.MEDIUM, reporter: 'asha', assignee: 'asha', age: 15 },
  { title: 'Lighthouse accessibility score dropped to 78', description: 'Contrast failures on the secondary button.', status: IssueStatus.OPEN, priority: IssuePriority.HIGH, reporter: 'asha', assignee: null, age: 6 },
  { title: 'Stale cache serves last week’s homepage', description: 'CDN TTL is set to seven days.', status: IssueStatus.CLOSED, priority: IssuePriority.CRITICAL, reporter: 'ravi', assignee: 'asha', age: 25 },
];

const API_ISSUES: IssueSeed[] = [
  { title: 'Rate limit headers missing from responses', description: 'Clients cannot back off without them.', status: IssueStatus.OPEN, priority: IssuePriority.HIGH, reporter: 'mei', assignee: 'asha', age: 2 },
  { title: 'Pagination cursor breaks on deleted rows', description: null, status: IssueStatus.IN_PROGRESS, priority: IssuePriority.CRITICAL, reporter: 'asha', assignee: 'mei', age: 4 },
  { title: 'OpenAPI schema out of date for /v2/orders', description: 'The response example still shows the v1 shape.', status: IssueStatus.OPEN, priority: IssuePriority.MEDIUM, reporter: 'mei', assignee: null, age: 8 },
  { title: '500 on empty request body', description: 'The JSON parser error is not translated to a 400.', status: IssueStatus.RESOLVED, priority: IssuePriority.HIGH, reporter: 'asha', assignee: 'asha', age: 11 },
  { title: 'Timestamps returned without a timezone', description: null, status: IssueStatus.OPEN, priority: IssuePriority.LOW, reporter: 'mei', assignee: null, age: 14 },
  { title: 'Webhook retries hammer the endpoint', description: 'No exponential backoff between attempts.', status: IssueStatus.CLOSED, priority: IssuePriority.MEDIUM, reporter: 'asha', assignee: 'mei', age: 18 },
  { title: 'Deprecated /v1 endpoints still undocumented', description: null, status: IssueStatus.OPEN, priority: IssuePriority.LOW, reporter: 'mei', assignee: 'mei', age: 6 },
  { title: 'Auth errors leak the internal user id', description: 'The 401 body contains a database identifier.', status: IssueStatus.IN_PROGRESS, priority: IssuePriority.CRITICAL, reporter: 'asha', assignee: 'asha', age: 1 },
];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const users: Record<string, string> = {};
  for (const user of USERS) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name },
      create: { name: user.name, email: user.email, passwordHash },
      select: { id: true },
    });
    users[user.email.split('@')[0] as string] = record.id;
  }

  const projects: Record<string, string> = {};
  for (const project of PROJECTS) {
    const record = await prisma.project.upsert({
      where: { key: project.key },
      update: { name: project.name, description: project.description },
      create: project,
      select: { id: true },
    });
    projects[project.key] = record.id;
  }

  const memberships: [string, string, Role][] = [
    ['WEB', 'asha', Role.MAINTAINER],
    ['WEB', 'ravi', Role.MEMBER],
    ['API', 'asha', Role.MAINTAINER],
    ['API', 'mei', Role.MEMBER],
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

  // Issues have no natural unique key, so re-seeding replaces this project's issues
  // wholesale rather than accumulating duplicates. Comments cascade with them.
  //
  // Delete + recreate runs in ONE transaction: an interrupted seed (Ctrl-C, dropped
  // connection) must roll back to the previous issue set rather than leave a reviewer
  // with a silently half-populated project.
  const seedIssues = async (projectKey: string, seeds: IssueSeed[]): Promise<string[]> => {
    const projectId = projects[projectKey] as string;

    return prisma.$transaction(async (tx) => {
      await tx.issue.deleteMany({ where: { projectId } });

      const ids: string[] = [];
      for (const seed of seeds) {
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
    });
  };

  const webIssueIds = await seedIssues('WEB', WEB_ISSUES);
  const apiIssueIds = await seedIssues('API', API_ISSUES);

  const threads: [string, [string, string][]][] = [
    [
      webIssueIds[0] as string,
      [
        ['ravi', 'Reproduced on iOS 17.4 with Safari 17.'],
        ['asha', 'Looks like the tap handler is attached after hydration. Investigating.'],
        ['asha', 'Fix is in review — should land today.'],
      ],
    ],
    [
      webIssueIds[3] as string,
      [
        ['ravi', 'Two customers reported this today.'],
        ['asha', 'Raising to critical; the provider is returning 429s.'],
      ],
    ],
    [
      apiIssueIds[1] as string,
      [
        ['asha', 'Cursor decoding assumes the row still exists.'],
        ['mei', 'Switching to a keyset that includes the id as a tiebreaker.'],
      ],
    ],
    [
      apiIssueIds[7] as string,
      [
        ['asha', 'The 401 body must never include database identifiers.'],
        ['mei', 'Agreed — replacing it with a generic message.'],
        ['asha', 'Add a regression test alongside the fix, please.'],
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
  console.info(`Demo login: ${USERS[0].email} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
