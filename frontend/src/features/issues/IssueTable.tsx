import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { CommentIcon, MoreIcon, PaperclipIcon } from '../../components/icons';
import { useToast } from '../../components/toast-context';
import type { IssueRow, IssueStatus } from '../../types/api';
import { formatAge, initials, shortId } from '../../utils/format';
import { PRIORITY_META, STATUS_META } from '../../utils/labels';

interface Props {
  issues: IssueRow[];
  selectedIssueId?: string | null;
  onIssueSelect?: (issue: IssueRow) => void;
}

const STATUS_GROUPS: Array<{
  status: IssueStatus;
  colour: string;
  soft: string;
}> = [
  { status: 'OPEN', colour: '#e33048', soft: '#fff0f3' },
  { status: 'IN_PROGRESS', colour: '#1769ff', soft: '#edf4ff' },
  { status: 'RESOLVED', colour: '#12a66a', soft: '#e9f9f1' },
  { status: 'CLOSED', colour: '#8a96ad', soft: '#f4f7fb' },
];

const priorityColour = {
  LOW: '#8a96ad',
  MEDIUM: '#f1a000',
  HIGH: '#ff7617',
  CRITICAL: '#e33048',
};

function AssigneeCell({ issue }: { issue: IssueRow }) {
  if (!issue.assignee) return <span className="assignee-cell">Unassigned</span>;
  return (
    <span className="assignee-cell" title={issue.assignee.name}>
      <span className="avatar sm">{initials(issue.assignee.name)}</span>
    </span>
  );
}

export function IssueTable({ issues, selectedIssueId, onIssueSelect }: Props) {
  const navigate = useNavigate();
  const toast = useToast();
  const [menuIssueId, setMenuIssueId] = useState<string | null>(null);
  const grouped = STATUS_GROUPS.map((group) => ({
    ...group,
    issues: issues.filter((issue) => issue.status === group.status),
  })).filter((group) => group.issues.length > 0);

  return (
    <div className="issue-groups">
      {grouped.map((group) => (
        <section key={group.status} className="issue-group" aria-labelledby={`issues-${group.status}`}>
          <div
            className="group-header"
            style={
              {
                '--group': group.colour,
                '--group-soft': group.soft,
              } as CSSProperties
            }
          >
            <span className="group-title" id={`issues-${group.status}`}>
              {group.status === 'OPEN' ? 'Needs attention' : STATUS_META[group.status].label}
            </span>
            <span className="group-count">{group.issues.length}</span>
            <span className="group-spacer" />
            <button
              type="button"
              className="icon-button"
              aria-label={`${STATUS_META[group.status].label} options`}
              onClick={() => toast.success(`${group.issues.length} ${STATUS_META[group.status].label.toLowerCase()} issues in this section`)}
            >
              <MoreIcon />
            </button>
          </div>

          <div className="table-header" role="row">
            <span>Key</span>
            <span>Title</span>
            <span>Area</span>
            <span>Assignee</span>
            <span>Priority</span>
            <span>Updated</span>
            <span />
            <span />
            <span />
          </div>

          {group.issues.map((issue) => {
            const selected = selectedIssueId === issue.id;
            const selectIssue = () =>
              onIssueSelect ? onIssueSelect(issue) : navigate(`/issues/${issue.id}`);

            return (
              <div
                key={issue.id}
                className={`issue-row ${selected ? 'selected' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`Open ${shortId(issue.id)} ${issue.title}`}
                onClick={selectIssue}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectIssue();
                  }
                }}
              >
                <span className="issue-key">{shortId(issue.id).toUpperCase()}</span>
                <span className="issue-title">{issue.title}</span>
                <span className="area-cell">
                  <span className="area-icon" style={{ '--area': '#1b76f0', '--area-soft': '#edf5ff' } as CSSProperties}>
                    IH
                  </span>
                  <span>Issue</span>
                </span>
                <AssigneeCell issue={issue} />
                <span className="priority-cell">
                  <i className="priority-dot" style={{ '--priority': priorityColour[issue.priority] } as CSSProperties} />
                  {PRIORITY_META[issue.priority].label}
                </span>
                <span className="updated-cell">{formatAge(issue.updatedAt)} ago</span>
                <span className="meta-cell comments">
                  <CommentIcon />
                  {issue.commentCount}
                </span>
                <span className="meta-cell attachments">
                  <PaperclipIcon />
                  0
                </span>
                <span className="issuehub-row-actions">
                  <button
                    type="button"
                    className="kebab"
                    aria-label="Issue actions"
                    aria-expanded={menuIssueId === issue.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setMenuIssueId((current) => (current === issue.id ? null : issue.id));
                    }}
                  >
                    <MoreIcon />
                  </button>
                  {menuIssueId === issue.id && (
                    <span className="popover issuehub-inline-menu" role="menu" aria-label="Issue actions">
                      <button
                        type="button"
                        className="popover-item"
                        role="menuitem"
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuIssueId(null);
                          navigate(`/issues/${issue.id}`);
                        }}
                      >
                        Open issue page
                      </button>
                      <button
                        type="button"
                        className="popover-item"
                        role="menuitem"
                        onClick={(event) => {
                          event.stopPropagation();
                          setMenuIssueId(null);
                          void navigator.clipboard?.writeText(`${window.location.origin}/issues/${issue.id}`);
                          toast.success('Issue link copied');
                        }}
                      >
                        Copy issue link
                      </button>
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
