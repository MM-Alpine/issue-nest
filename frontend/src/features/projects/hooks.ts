import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as projectsApi from '../../api/projects';
import type { Role } from '../../types/api';

export const projectKeys = {
  all: ['projects'] as const,
  detail: (projectId: string) => ['project', projectId] as const,
  members: (projectId: string) => ['project', projectId, 'members'] as const,
};

export const useProjects = () =>
  useQuery({ queryKey: projectKeys.all, queryFn: projectsApi.listProjects });

export const useProject = (projectId: string) =>
  useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => projectsApi.getProject(projectId),
  });

export const useMembers = (projectId: string, enabled = true) =>
  useQuery({
    queryKey: projectKeys.members(projectId),
    queryFn: () => projectsApi.listMembers(projectId),
    enabled,
  });

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.all }),
  });
}

export function useAddMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; role: Role }) => projectsApi.addMember(projectId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}
