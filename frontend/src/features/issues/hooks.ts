import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as issuesApi from '../../api/issues';
import type { IssueListParams } from '../../types/api';
import { projectKeys } from '../projects/hooks';

export const issueKeys = {
  list: (projectId: string, params: IssueListParams) => ['issues', projectId, params] as const,
  listRoot: (projectId: string) => ['issues', projectId] as const,
  detail: (issueId: string) => ['issue', issueId] as const,
};

/** The parsed query string IS the cache key, so back/forward render from cache. */
export const useIssues = (projectId: string, params: IssueListParams) =>
  useQuery({
    queryKey: issueKeys.list(projectId, params),
    queryFn: () => issuesApi.listIssues(projectId, params),
    placeholderData: (previous) => previous,
  });

export const useIssue = (issueId: string) =>
  useQuery({ queryKey: issueKeys.detail(issueId), queryFn: () => issuesApi.getIssue(issueId) });

export function useCreateIssue(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: issuesApi.CreateIssueInput) => issuesApi.createIssue(projectId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: issueKeys.listRoot(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

export function useUpdateIssue(issueId: string, projectId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: issuesApi.UpdateIssueInput) => issuesApi.updateIssue(issueId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: issueKeys.detail(issueId) });
      if (projectId) {
        void queryClient.invalidateQueries({ queryKey: issueKeys.listRoot(projectId) });
      }
    },
  });
}

export function useDeleteIssue(issueId: string, projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => issuesApi.deleteIssue(issueId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: issueKeys.detail(issueId) });
      void queryClient.invalidateQueries({ queryKey: issueKeys.listRoot(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}
