import type { Comment } from '../types/api';
import { apiFetch } from './client';

export const listComments = (issueId: string) =>
  apiFetch<{ comments: Comment[] }>(`/api/issues/${issueId}/comments`).then((r) => r.comments);

export const addComment = (issueId: string, body: { body: string }) =>
  apiFetch<{ comment: Comment }>(`/api/issues/${issueId}/comments`, {
    method: 'POST',
    body,
  }).then((r) => r.comment);
