import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { Button } from '../components/Button';
import { controlClass } from '../components/control-styles';
import { Modal } from '../components/Modal';
import { Skeleton } from '../components/Skeleton';
import { ErrorState } from '../components/States';
import { useToast } from '../components/toast-context';
import { useAuth } from '../features/auth/auth-context';
import { CommentThread } from '../features/comments/CommentThread';
import { IssueFormModal } from '../features/issues/IssueFormModal';
import { Avatar, PriorityBadge, StatusBadge } from '../features/issues/badges';
import { useDeleteIssue, useIssue, useUpdateIssue } from '../features/issues/hooks';
import { useMembers } from '../features/projects/hooks';
import { ISSUE_STATUSES, type IssueStatus } from '../types/api';
import { formatDateTime, initials, shortId } from '../utils/format';
import { STATUS_META } from '../utils/labels';
import { NotFoundPage } from './NotFoundPage';

function Property({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-medium text-slate-500">{label}</span>
      {children}
    </div>
  );
}

export function IssueDetailPage() {
  const { issueId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const query = useIssue(issueId);
  const issue = query.data?.issue;
  const viewerRole = query.data?.viewerRole;
  const projectId = issue?.project.id;

  const members = useMembers(projectId ?? '', Boolean(projectId));
  const updateIssue = useUpdateIssue(issueId, projectId);
  const deleteIssue = useDeleteIssue(issueId, projectId ?? '');

  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400)) {
    return <NotFoundPage />;
  }

  if (query.isError) {
    return (
      <ErrorState
        title="Couldn't load this issue"
        message={query.error instanceof Error ? query.error.message : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (query.isPending || !issue) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-busy="true">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const isMaintainer = viewerRole === 'MAINTAINER';
  const isReporter = issue.reporter.id === user?.id;
  // Maintainers can edit anything; a reporter can edit their own title/description/priority.
  const canEdit = isMaintainer || isReporter;

  const patchStatus = (status: IssueStatus) => {
    updateIssue.mutate(
      { status },
      {
        onSuccess: () => toast.success(`Status updated to ${STATUS_META[status].label}`),
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : 'Could not update the status'),
      },
    );
  };

  const patchAssignee = (assigneeId: string) => {
    updateIssue.mutate(
      { assigneeId: assigneeId || null },
      {
        onSuccess: (updated) =>
          toast.success(
            updated.assignee ? `Assigned to ${updated.assignee.name}` : 'Assignee cleared',
          ),
        onError: (error) =>
          toast.error(error instanceof ApiError ? error.message : 'Could not update the assignee'),
      },
    );
  };

  const metadata = (
    <aside
      aria-label="Issue metadata"
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:w-[300px] lg:shrink-0"
    >
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-sm font-semibold text-slate-900">Issue properties</h2>
        <p className="pt-1 text-xs text-slate-500">Status, ownership, and timestamps.</p>
      </div>

      <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-1">
        <Property label="Status">
          {isMaintainer ? (
            <>
              <label htmlFor="status-select" className="sr-only">
                Change status
              </label>
              <select
                id="status-select"
                className={`${controlClass()} h-9`}
                value={issue.status}
                disabled={updateIssue.isPending}
                onChange={(e) => patchStatus(e.target.value as IssueStatus)}
              >
                {ISSUE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_META[status].label}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <StatusBadge status={issue.status} />
          )}
        </Property>

        <Property label="Priority">
          <PriorityBadge priority={issue.priority} />
        </Property>

        <Property label="Assignee">
          {isMaintainer ? (
            <>
              <label htmlFor="assignee-select" className="sr-only">
                Change assignee
              </label>
              <select
                id="assignee-select"
                className={`${controlClass()} h-9`}
                value={issue.assignee?.id ?? ''}
                disabled={updateIssue.isPending}
                onChange={(e) => patchAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {(members.data ?? []).map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span className="text-sm text-slate-700">{issue.assignee?.name ?? 'Unassigned'}</span>
          )}
        </Property>

        <Property label="Reporter">
          <span className="flex items-center gap-2 text-sm text-slate-700">
            <Avatar name={initials(issue.reporter.name)} />
            {issue.reporter.name}
          </span>
        </Property>

        <Property label="Created">
          <time className="text-sm text-slate-700" dateTime={issue.createdAt}>
            {formatDateTime(issue.createdAt)}
          </time>
        </Property>

        <Property label="Updated">
          <time className="text-sm text-slate-700" dateTime={issue.updatedAt}>
            {formatDateTime(issue.updatedAt)}
          </time>
        </Property>
      </div>
    </aside>
  );

  return (
    <>
      <nav aria-label="Breadcrumb" className="pb-2 text-xs text-slate-500">
        <Link to="/projects" className="rounded hover:text-slate-700">
          Projects
        </Link>
        <span aria-hidden="true"> / </span>
        <Link to={`/projects/${issue.project.id}`} className="rounded font-mono hover:text-slate-700">
          {issue.project.key}
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="font-mono">{shortId(issue.id)}</span>
      </nav>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-medium text-slate-500">
                {shortId(issue.id)}
              </span>
              <span className="text-xs text-slate-400">{issue.project.name}</span>
            </div>
            <h1 className="text-2xl font-semibold break-words text-slate-900">{issue.title}</h1>
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <StatusBadge status={issue.status} />
              <PriorityBadge priority={issue.priority} />
            </div>
          </div>

          {/* Controls a viewer cannot use are not rendered at all (docs/03 §1). */}
          <div className="flex shrink-0 gap-2">
            {canEdit && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
            {isMaintainer && (
              <Button variant="secondary" onClick={() => setConfirmingDelete(true)}>
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row-reverse lg:items-start">
        {metadata}

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section aria-labelledby="description-heading">
            <h2 id="description-heading" className="pb-2 text-base font-semibold text-slate-900">
              Description
            </h2>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              {issue.description ? (
                <p className="text-sm whitespace-pre-wrap text-slate-800">{issue.description}</p>
              ) : (
                <p className="text-sm text-slate-400">No description provided.</p>
              )}
            </div>
          </section>

          <CommentThread issueId={issue.id} />
        </div>
      </div>

      <IssueFormModal
        open={editing}
        onClose={() => setEditing(false)}
        mode="edit"
        members={members.data ?? []}
        canAssign={isMaintainer}
        initial={{
          title: issue.title,
          description: issue.description ?? '',
          priority: issue.priority,
          assigneeId: issue.assignee?.id ?? '',
        }}
        pending={updateIssue.isPending}
        error={updateIssue.error}
        onSubmit={(values) =>
          updateIssue.mutate(values, {
            onSuccess: () => {
              toast.success('Issue updated');
              setEditing(false);
            },
            onError: (error) => {
              if (error instanceof ApiError && !error.details) toast.error(error.message);
            },
          })
        }
      />

      <Modal
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title="Delete this issue?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              pending={deleteIssue.isPending}
              onClick={() =>
                deleteIssue.mutate(undefined, {
                  onSuccess: () => {
                    toast.success('Issue deleted');
                    navigate(`/projects/${issue.project.id}`, { replace: true });
                  },
                  onError: (error) =>
                    toast.error(
                      error instanceof ApiError ? error.message : 'Could not delete the issue',
                    ),
                })
              }
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          &ldquo;{issue.title}&rdquo; and its comments will be permanently removed. This
          can&rsquo;t be undone.
        </p>
      </Modal>
    </>
  );
}
