import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { Button } from '../components/Button';
import { PlusIcon, UsersIcon } from '../components/icons';
import { Pagination } from '../components/Pagination';
import { Skeleton, SkeletonRows } from '../components/Skeleton';
import { EmptyState, ErrorState } from '../components/States';
import { useToast } from '../components/toast-context';
import { IssueFilters } from '../features/issues/IssueFilters';
import { IssueFormModal } from '../features/issues/IssueFormModal';
import { IssueTable } from '../features/issues/IssueTable';
import { useCreateIssue, useIssues } from '../features/issues/hooks';
import { useIssueFilters } from '../features/issues/useIssueFilters';
import { MembersDrawer } from '../features/projects/MembersDrawer';
import { useMembers, useProject } from '../features/projects/hooks';
import { NotFoundPage } from './NotFoundPage';

export function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const toast = useToast();

  const project = useProject(projectId);
  const members = useMembers(projectId);
  const { params, setFilters, clearFilters, hasActiveFilters } = useIssueFilters();
  const issues = useIssues(projectId, params);
  const createIssue = useCreateIssue(projectId);

  const [membersOpen, setMembersOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const isMaintainer = project.data?.role === 'MAINTAINER';
  const visibleIssues = issues.data?.issues ?? [];
  const visibleActiveIssues = visibleIssues.filter(
    (issue) => issue.status === 'OPEN' || issue.status === 'IN_PROGRESS',
  ).length;
  const visibleCriticalIssues = visibleIssues.filter((issue) => issue.priority === 'CRITICAL').length;

  // A non-member gets 404 from the API; the UI must not distinguish that from
  // "deleted" either (docs/03 §5.6).
  if (project.error instanceof ApiError && project.error.status === 404) {
    return <NotFoundPage />;
  }

  if (project.isError) {
    return (
      <ErrorState
        title="Couldn't load this project"
        message={project.error instanceof Error ? project.error.message : undefined}
        onRetry={() => void project.refetch()}
      />
    );
  }

  return (
    <>
      <nav aria-label="Breadcrumb" className="pb-2 text-xs text-slate-500">
        <Link to="/projects" className="rounded hover:text-slate-700">
          Projects
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="font-mono">{project.data?.key ?? '…'}</span>
      </nav>

      <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {project.isPending ? (
            <>
              <Skeleton className="h-7 w-56" />
              <Skeleton className="mt-2 h-3 w-32" />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-slate-900">{project.data.name}</h1>
              <p className="pt-1 text-xs text-slate-500">
                <span className="font-mono">{project.data.key}</span> ·{' '}
                {project.data.memberCount}{' '}
                {project.data.memberCount === 1 ? 'member' : 'members'}
              </p>
              {project.data.description && (
                <p className="max-w-2xl pt-2 text-sm text-slate-600">{project.data.description}</p>
              )}
              {issues.data && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {issues.data.meta.total}{' '}
                    {hasActiveFilters
                      ? issues.data.meta.total === 1
                        ? 'matching issue'
                        : 'matching issues'
                      : issues.data.meta.total === 1
                        ? 'total issue'
                        : 'total issues'}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {visibleActiveIssues} active visible
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {visibleCriticalIssues} critical visible
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" onClick={() => setMembersOpen(true)}>
            <UsersIcon />
            Members
          </Button>
          <Button onClick={() => setCreating(true)}>
            <PlusIcon />
            New issue
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <IssueFilters
          params={params}
          members={members.data ?? []}
          onChange={setFilters}
          onClear={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        <div className="flex items-center justify-between gap-3">
          {issues.data && (
            <p className="text-xs font-medium text-slate-500" aria-live="polite">
              Showing {issues.data.issues.length} of {issues.data.meta.total}{' '}
              {issues.data.meta.total === 1 ? 'issue' : 'issues'}
            </p>
          )}
          {issues.isFetching && !issues.isPending && (
            <p className="text-xs text-slate-400" role="status">
              Updating...
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {issues.isPending ? (
            <SkeletonRows />
          ) : issues.isError ? (
            <ErrorState
              title="Couldn't load issues"
              message={issues.error instanceof Error ? issues.error.message : undefined}
              onRetry={() => void issues.refetch()}
            />
          ) : issues.data.issues.length === 0 ? (
            // Two deliberately different empty states (docs/03 §5.4).
            hasActiveFilters ? (
              <EmptyState
                title="No issues match your filters"
                description="Try a different search term, or clear the filters to see everything."
                action={
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="No issues yet"
                description="File the first issue for this project."
                action={<Button onClick={() => setCreating(true)}>New issue</Button>}
              />
            )
          ) : (
            <>
              <div aria-busy={issues.isFetching || undefined}>
                <IssueTable issues={issues.data.issues} />
              </div>
              <Pagination
                page={issues.data.meta.page}
                totalPages={issues.data.meta.totalPages}
                onChange={(page) => setFilters({ ...params, page })}
              />
            </>
          )}
        </div>
      </div>

      <MembersDrawer
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        projectId={projectId}
        canAddMembers={Boolean(isMaintainer)}
      />

      <IssueFormModal
        open={creating}
        onClose={() => setCreating(false)}
        mode="create"
        members={members.data ?? []}
        canAssign={Boolean(isMaintainer)}
        pending={createIssue.isPending}
        error={createIssue.error}
        onSubmit={(values) =>
          createIssue.mutate(values, {
            onSuccess: () => {
              toast.success('Issue created');
              setCreating(false);
            },
            onError: (error) => {
              if (error instanceof ApiError && !error.details) toast.error(error.message);
            },
          })
        }
      />
    </>
  );
}
