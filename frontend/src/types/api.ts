/**
 * Hand-written mirrors of the API contract in docs/05. ~80 lines beats adding a
 * codegen toolchain for a 17-endpoint API (docs/02 §15).
 */
export type Role = 'MAINTAINER' | 'MEMBER';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const ISSUE_STATUSES: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
export const ISSUE_PRIORITIES: IssuePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

/**
 * Narrows a raw `<select>` value (or a query-string value) to a known union member,
 * returning undefined for anything else. Used instead of a cast so that drift between
 * an option list and its type is a compile error rather than a silent bad request.
 */
export function asOneOf<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Users embedded anywhere are always exactly this shape — never a password hash. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface CurrentUser extends PublicUser {
  createdAt: string;
}

export interface AuthResponse {
  user: CurrentUser;
  accessToken: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  key: string;
  description: string | null;
  role: Role;
  issueCount: number;
  createdAt: string;
}

export interface ProjectDetail extends ProjectSummary {
  memberCount: number;
}

export interface Member {
  userId: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface IssueRow {
  id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  reporter: PublicUser;
  assignee: PublicUser | null;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IssueDetail {
  id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  priority: IssuePriority;
  project: { id: string; key: string; name: string };
  reporter: PublicUser;
  assignee: PublicUser | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface IssueListResponse {
  issues: IssueRow[];
  meta: PaginationMeta;
}

export interface Comment {
  id: string;
  body: string;
  author: PublicUser;
  createdAt: string;
  updatedAt: string;
}

export type IssueSort = 'createdAt' | 'priority' | 'status';
export type SortOrder = 'asc' | 'desc';

export const ISSUE_SORTS: IssueSort[] = ['createdAt', 'priority', 'status'];
export const SORT_ORDERS: SortOrder[] = ['asc', 'desc'];

export interface IssueListParams {
  q?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  assignee?: string;
  sort?: IssueSort;
  order?: SortOrder;
  page?: number;
  pageSize?: number;
}
