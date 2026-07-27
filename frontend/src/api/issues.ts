import type {
  IssueDetail,
  IssueListParams,
  IssueListResponse,
  IssuePriority,
  IssueRow,
  IssueStatus,
} from '../types/api';
import { apiFetch, toQueryString } from './client';

export const listIssues = (projectId: string, params: IssueListParams) =>
  apiFetch<IssueListResponse>(
    `/api/projects/${projectId}/issues${toQueryString({ ...params })}`,
  );

export interface CreateIssueInput {
  title: string;
  description?: string | null;
  priority: IssuePriority;
  /** Only sent by maintainers — the server rejects a member supplying it at all. */
  assigneeId?: string | null;
}

export const createIssue = (projectId: string, body: CreateIssueInput) =>
  apiFetch<{ issue: IssueRow }>(`/api/projects/${projectId}/issues`, {
    method: 'POST',
    body,
  }).then((r) => r.issue);

export const getIssue = (issueId: string) =>
  apiFetch<{ issue: IssueDetail; viewerRole: 'MAINTAINER' | 'MEMBER' }>(`/api/issues/${issueId}`);

export interface UpdateIssueInput {
  title?: string;
  description?: string | null;
  priority?: IssuePriority;
  status?: IssueStatus;
  assigneeId?: string | null;
}

export const updateIssue = (issueId: string, body: UpdateIssueInput) =>
  apiFetch<{ issue: IssueDetail }>(`/api/issues/${issueId}`, { method: 'PATCH', body }).then(
    (r) => r.issue,
  );

export const deleteIssue = (issueId: string) =>
  apiFetch<void>(`/api/issues/${issueId}`, { method: 'DELETE' });
