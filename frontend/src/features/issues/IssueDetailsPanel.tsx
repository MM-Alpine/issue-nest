import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import {
  CloseIcon,
  ExternalLinkIcon,
  LinkIcon,
  PinIcon,
  StarIcon,
} from '../../components/icons';
import { Skeleton } from '../../components/Skeleton';
import { useToast } from '../../components/toast-context';
import { CommentThread } from '../comments/CommentThread';
import { useComments } from '../comments/hooks';
import { useAuth } from '../auth/auth-context';
import { useMembers } from '../projects/hooks';
import { ISSUE_STATUSES, type IssueRow, type IssueStatus } from '../../types/api';
import { formatDateTime, initials, shortId } from '../../utils/format';
import { PRIORITY_META, STATUS_META } from '../../utils/labels';
import { IssueFormModal } from './IssueFormModal';
import { useIssue, useUpdateIssue } from './hooks';

interface Props {
  issue: IssueRow | null;
  projectId: string;
  canEdit: boolean;
  canTriage: boolean;
  onClose?: () => void;
}

const priorityColour = {
  LOW: '#8a96ad',
  MEDIUM: '#f1a000',
  HIGH: '#ff7617',
  CRITICAL: '#e33048',
};

export function IssueDetailsPanel({ issue, projectId, canEdit, canTriage, onClose }: Props) {
  const toast = useToast();
  const { user } = useAuth();
  const detail = useIssue(issue?.id ?? '', Boolean(issue));
  const comments = useComments(issue?.id ?? '', Boolean(issue));
  const members = useMembers(projectId, Boolean(projectId));
  const updateIssue = useUpdateIssue(issue?.id ?? '', projectId);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<'details' | 'comments' | 'activity' | 'related'>('details');
  const [pinned, setPinned] = useState(false);
  const [starred, setStarred] = useState(false);

  const fullIssue = detail.data?.issue;
  const displayIssue = fullIssue ?? issue;
  const commentCount = comments.data?.length ?? issue?.commentCount ?? 0;

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

  if (!displayIssue) {
    return (
      <aside className="detail-panel issuehub-detail-empty">
        <div className="empty-state">
          <div className="empty-icon">IH</div>
          <h3>Select an issue</h3>
          <p>Choose a row to inspect details without leaving the list.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="detail-panel">
      <header className="detail-header">
        <div className="detail-topline">
          <span className="detail-key">{shortId(displayIssue.id).toUpperCase()}</span>
          {fullIssue && <span className="text-[11px] text-slate-400">{fullIssue.project.key}</span>}
          <div className="detail-actions">
            <button
              type="button"
              className="kebab"
              aria-label="Copy issue link"
              onClick={() => {
                void navigator.clipboard?.writeText(`${window.location.origin}/issues/${displayIssue.id}`);
                toast.success('Issue link copied');
              }}
            >
              <LinkIcon />
            </button>
            <button
              type="button"
              className={`kebab ${pinned ? 'active' : ''}`}
              aria-label="Pin issue"
              aria-pressed={pinned}
              onClick={() => {
                setPinned((current) => !current);
                toast.success(pinned ? 'Issue unpinned' : 'Issue pinned');
              }}
            >
              <PinIcon />
            </button>
            <button
              type="button"
              className={`kebab ${starred ? 'active' : ''}`}
              aria-label="Star issue"
              aria-pressed={starred}
              onClick={() => {
                setStarred((current) => !current);
                toast.success(starred ? 'Issue unstarred' : 'Issue starred');
              }}
            >
              <StarIcon />
            </button>
            <Link to={`/issues/${displayIssue.id}`} className="kebab" aria-label="Open issue page">
              <ExternalLinkIcon />
            </Link>
            <button type="button" className="kebab" aria-label="Close details" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </div>
        <h2>{displayIssue.title}</h2>
        <div className="detail-badges">
          <span className="status-pill readonly-pill">{STATUS_META[displayIssue.status].label}</span>
          <span className="priority-pill readonly-pill">
            <i
              className="priority-dot"
              style={{ '--priority': priorityColour[displayIssue.priority] } as CSSProperties}
            />
            {PRIORITY_META[displayIssue.priority].label}
          </span>
          {canEdit && (
            <button type="button" className="button secondary small issuehub-detail-edit" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
        </div>
      </header>

      <div className="detail-scroll">
        {detail.isPending && !fullIssue ? (
          <div className="detail-body" role="status" aria-busy="true">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="mt-3 h-32 w-full" />
          </div>
        ) : (
          <>
            <div className="detail-meta">
              <div className="meta-row">
                <span>Status</span>
                <span className="meta-value">
                  {canTriage ? (
                    <select
                      aria-label="Change status"
                      value={displayIssue.status}
                      disabled={updateIssue.isPending}
                      onChange={(event) => patchStatus(event.target.value as IssueStatus)}
                    >
                      {ISSUE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_META[status].label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    STATUS_META[displayIssue.status].label
                  )}
                </span>
              </div>
              <div className="meta-row">
                <span>Assignee</span>
                <span className="meta-value">
                  {displayIssue.assignee && <span className="avatar sm">{initials(displayIssue.assignee.name)}</span>}
                  {canTriage ? (
                    <>
                      <select
                        aria-label="Change assignee"
                        value={displayIssue.assignee?.id ?? ''}
                        disabled={updateIssue.isPending}
                        onChange={(event) => patchAssignee(event.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {(members.data ?? []).map((member) => (
                          <option key={member.userId} value={member.userId}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="assign-link"
                        onClick={() => {
                          if (user) patchAssignee(user.id);
                        }}
                      >
                        Assign to me
                      </button>
                    </>
                  ) : (
                    displayIssue.assignee?.name ?? 'Unassigned'
                  )}
                </span>
              </div>
              <div className="meta-row">
                <span>Reporter</span>
                <span className="meta-value">
                  <span className="avatar sm">{initials(displayIssue.reporter.name)}</span>
                  {displayIssue.reporter.name}
                </span>
              </div>
              <div className="meta-row">
                <span>Updated</span>
                <time className="meta-value" dateTime={displayIssue.updatedAt}>
                  {formatDateTime(displayIssue.updatedAt)}
                </time>
              </div>
            </div>

            <div className="detail-tabs">
              {[
                ['details', 'Details'],
                ['activity', 'Activity'],
                ['comments', `Comments ${commentCount}`],
                ['related', 'Related'],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`detail-tab ${tab === key ? 'active' : ''}`}
                  onClick={() => setTab(key as typeof tab)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="detail-body">
              {tab === 'details' && (
                <>
                  <section className="detail-section">
                    <h3>Description</h3>
                    {displayIssue.description ? (
                      <p>{displayIssue.description}</p>
                    ) : (
                      <p>No description provided.</p>
                    )}
                  </section>
                  <section className="detail-section">
                    <h3>Environment</h3>
                    <div className="env-list">
                      <span>IssueHub</span>
                      <span className="env-dot" />
                      <span>Web app</span>
                    </div>
                  </section>
                </>
              )}
              {tab === 'comments' && <CommentThread issueId={displayIssue.id} />}
              {tab === 'activity' && (
                <section className="detail-section">
                  <h3>Activity</h3>
                  <p>Latest update recorded {formatDateTime(displayIssue.updatedAt)}.</p>
                </section>
              )}
              {tab === 'related' && (
                <section className="detail-section">
                  <h3>Related issues</h3>
                  <p>No directly related issues were found.</p>
                </section>
              )}
            </div>
          </>
        )}
      </div>

      <IssueFormModal
        open={editing}
        onClose={() => setEditing(false)}
        mode="edit"
        members={members.data ?? []}
        canAssign={canTriage}
        initial={{
          title: displayIssue.title,
          description: displayIssue.description ?? '',
          priority: displayIssue.priority,
          assigneeId: displayIssue.assignee?.id ?? '',
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
    </aside>
  );
}
