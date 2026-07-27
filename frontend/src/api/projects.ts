import type { Member, ProjectDetail, ProjectSummary, Role } from '../types/api';
import { apiFetch } from './client';

export const listProjects = () =>
  apiFetch<{ projects: ProjectSummary[] }>('/api/projects').then((r) => r.projects);

export const getProject = (projectId: string) =>
  apiFetch<{ project: ProjectDetail }>(`/api/projects/${projectId}`).then((r) => r.project);

export const createProject = (body: { name: string; key: string; description?: string }) =>
  apiFetch<{ project: ProjectSummary }>('/api/projects', { method: 'POST', body }).then(
    (r) => r.project,
  );

export const listMembers = (projectId: string) =>
  apiFetch<{ members: Member[] }>(`/api/projects/${projectId}/members`).then((r) => r.members);

export const addMember = (projectId: string, body: { email: string; role: Role }) =>
  apiFetch<{ member: Member }>(`/api/projects/${projectId}/members`, {
    method: 'POST',
    body,
  }).then((r) => r.member);
