import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as projectsApi from '../../api/projects';
import type { Role } from '../../types/api';

export const projectKeys = {
  all: ['projects'] as const,
  detail: (projectId: string) => ['project', projectId] as const,
  members: (projectId: string) => ['project', projectId, 'members'] as const,
  memberCandidates: (projectId: string) => ['project', projectId, 'member-candidates'] as const,
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

export const useMemberCandidates = (projectId: string, enabled = true) =>
  useQuery({
    queryKey: projectKeys.memberCandidates(projectId),
    queryFn: () => projectsApi.listMemberCandidates(projectId),
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
    mutationFn: (body: { email?: string; userId?: string; role: Role }) =>
      projectsApi.addMember(projectId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.memberCandidates(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useUpdateMemberRole(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      projectsApi.updateMemberRole(projectId, userId, { role }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.memberCandidates(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(projectId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.memberCandidates(projectId) });
      void queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}
