import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as commentsApi from '../../api/comments';
import { issueKeys } from '../issues/hooks';

export const commentKeys = {
  list: (issueId: string) => ['comments', issueId] as const,
};

export const useComments = (issueId: string) =>
  useQuery({
    queryKey: commentKeys.list(issueId),
    queryFn: () => commentsApi.listComments(issueId),
  });

export function useAddComment(issueId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => commentsApi.addComment(issueId, { body }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: commentKeys.list(issueId) });
      void queryClient.invalidateQueries({ queryKey: issueKeys.detail(issueId) });
    },
  });
}
