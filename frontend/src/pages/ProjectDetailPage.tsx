import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import {
  AlertIcon,
  BellIcon,
  CheckIcon,
  HelpIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from '../components/icons';
import { Pagination } from '../components/Pagination';
import { SkeletonRows } from '../components/Skeleton';
import { EmptyState, ErrorState } from '../components/States';
import { useToast } from '../components/toast-context';
import { useAuth } from '../features/auth/auth-context';
import { IssueDetailsPanel } from '../features/issues/IssueDetailsPanel';
import { IssueFilters } from '../features/issues/IssueFilters';
import { IssueFormModal } from '../features/issues/IssueFormModal';
import { IssueTable } from '../features/issues/IssueTable';
import { useCreateIssue, useIssues } from '../features/issues/hooks';
import { useIssueFilters } from '../features/issues/useIssueFilters';
import { MembersDrawer } from '../features/projects/MembersDrawer';
import { useMembers, useProject } from '../features/projects/hooks';
import type { IssueListParams, IssueRow, IssueStatus } from '../types/api';
import { formatAge, initials, shortId } from '../utils/format';
import { PRIORITY_META, STATUS_META } from '../utils/labels';
import { NotFoundPage } from './NotFoundPage';

type ProjectView = 'overview' | 'issues' | 'my-work';
const DETAIL_SELECTION_STATUS_ORDER: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

function MetricCard({
  label,
  value,
  status,
  tone = '#1769ff',
  soft = '#edf4ff',
  helper,
  onClick,
}: {
  label: string;
  value: number | string;
  status?: IssueStatus;
  tone?: string;
  soft?: string;
  helper: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className="metric-card"
      style={{ '--metric': tone, '--metric-soft': soft } as CSSProperties}
      onClick={onClick}
    >
      <div className="metric-top">
        <span className="metric-icon">{status === 'RESOLVED' ? <CheckIcon /> : <AlertIcon className="h-4 w-4" />}</span>
        <span className="metric-label">{label}</span>
        <span className="risk-pill">{helper}</span>
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-foot">
        <strong>{typeof value === 'number' ? value : helper}</strong>
        <span>{status ? 'matching issues' : 'release signal'}</span>
      </div>
      <svg className="sparkline" viewBox="0 0 86 35" fill="none">
        <path
          d="M3 27 C16 29 20 23 31 24 C42 25 43 16 53 17 C64 18 68 8 83 5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function ProjectOverview({
  issues,
  myWorkCount,
  memberCount,
  memberNames,
  metrics,
  onShowIssues,
  onShowMembers,
  onShowMyWork,
}: {
  issues: IssueRow[];
  myWorkCount: number;
  memberCount: number;
  memberNames: string[];
  metrics: { total: number; open: number; inProgress: number; resolved: number; critical: number; health: number };
  onShowIssues: () => void;
  onShowMembers: () => void;
  onShowMyWork: () => void;
}) {
  const recentIssues = issues.slice(0, 5);

  return (
    <div className="issuehub-overview-grid">
      <section className="issuehub-overview-panel issuehub-overview-panel-wide" aria-labelledby="overview-recent">
        <div className="issuehub-panel-head">
          <div>
            <span className="issuehub-panel-kicker">Project queue</span>
            <h2 id="overview-recent">Recent issues</h2>
          </div>
          <button type="button" className="button secondary small" onClick={onShowIssues}>
            View all
          </button>
        </div>

        {recentIssues.length === 0 ? (
          <EmptyState title="No issues yet" description="File the first issue for this project." />
        ) : (
          <div className="issuehub-overview-list">
            {recentIssues.map((issue) => (
              <button key={issue.id} type="button" className="issuehub-overview-issue" onClick={onShowIssues}>
                <span className="issue-key">{shortId(issue.id).toUpperCase()}</span>
                <span className="issuehub-overview-title">{issue.title}</span>
                <span className="status-chip">{STATUS_META[issue.status].label}</span>
                <span className="priority-cell">
                  <i
                    className="priority-dot"
                    style={
                      {
                        '--priority':
                          issue.priority === 'CRITICAL'
                            ? '#e33048'
                            : issue.priority === 'HIGH'
                              ? '#ff7617'
                              : issue.priority === 'MEDIUM'
                                ? '#f1a000'
                                : '#8a96ad',
                      } as CSSProperties
                    }
                  />
                  {PRIORITY_META[issue.priority].label}
                </span>
                <span className="updated-cell">{formatAge(issue.updatedAt)} ago</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="issuehub-overview-panel" aria-labelledby="overview-health">
        <div className="issuehub-panel-head">
          <div>
            <span className="issuehub-panel-kicker">Health</span>
            <h2 id="overview-health">{metrics.health}% resolved</h2>
          </div>
        </div>
        <div className="issuehub-health-track" aria-label={`${metrics.health}% of issues resolved`}>
          <span style={{ width: `${metrics.health}%` }} />
        </div>
        <dl className="issuehub-overview-stats">
          <div>
            <dt>Open</dt>
            <dd>{metrics.open}</dd>
          </div>
          <div>
            <dt>In progress</dt>
            <dd>{metrics.inProgress}</dd>
          </div>
          <div>
            <dt>Critical</dt>
            <dd>{metrics.critical}</dd>
          </div>
        </dl>
      </section>

      <section className="issuehub-overview-panel" aria-labelledby="overview-work">
        <div className="issuehub-panel-head">
          <div>
            <span className="issuehub-panel-kicker">Personal queue</span>
            <h2 id="overview-work">My work</h2>
          </div>
          <button type="button" className="button secondary small" onClick={onShowMyWork}>
            Open
          </button>
        </div>
        <div className="issuehub-overview-big-number">{myWorkCount}</div>
        <p className="issuehub-overview-copy">Assigned to you or reported by you in this project.</p>
      </section>

      <section className="issuehub-overview-panel" aria-labelledby="overview-members">
        <div className="issuehub-panel-head">
          <div>
            <span className="issuehub-panel-kicker">Team</span>
            <h2 id="overview-members">{memberCount} members</h2>
          </div>
          <button type="button" className="button secondary small" onClick={onShowMembers}>
            Manage
          </button>
        </div>
        <div className="avatar-stack issuehub-overview-avatar-stack">
          {memberNames.slice(0, 3).map((name) => (
            <span key={name} className="avatar sm">
              {initials(name)}
            </span>
          ))}
          {memberNames.length === 0 && <span className="avatar sm">--</span>}
        </div>
        <p className="issuehub-overview-copy">Review access and invite existing users into this project.</p>
      </section>
    </div>
  );
}

export function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const project = useProject(projectId);
  const members = useMembers(projectId);
  const { params, setFilters, clearFilters, hasActiveFilters } = useIssueFilters();
  const issues = useIssues(projectId, params);
  const projectSummaryParams = useMemo<IssueListParams>(
    () => ({ sort: 'createdAt', order: 'desc', page: 1, pageSize: 100 }),
    [],
  );
  const myWorkParams = useMemo<IssueListParams>(
    () => ({
      mine: true,
      sort: params.sort,
      order: params.order,
      page: params.page,
      pageSize: params.pageSize,
    }),
    [params.order, params.page, params.pageSize, params.sort],
  );
  const projectSummary = useIssues(projectId, projectSummaryParams);
  const myWork = useIssues(projectId, myWorkParams);
  const createIssue = useCreateIssue(projectId);

  const [membersOpen, setMembersOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [projectView, setProjectView] = useState<ProjectView>('issues');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [detailClosed, setDetailClosed] = useState(false);

  const isMaintainer = project.data?.role === 'MAINTAINER';
  const projectIssues = useMemo(
    () => projectSummary.data?.issues ?? issues.data?.issues ?? [],
    [issues.data?.issues, projectSummary.data?.issues],
  );
  const myWorkIssues = useMemo(() => myWork.data?.issues ?? [], [myWork.data?.issues]);
  const activeIssueQuery = projectView === 'my-work' ? myWork : issues;
  const visibleIssues = useMemo(
    () => activeIssueQuery.data?.issues ?? [],
    [activeIssueQuery.data?.issues],
  );
  const visibleTotal = activeIssueQuery.data?.meta.total ?? visibleIssues.length;
  const myWorkTotal = myWork.data?.meta.total ?? myWorkIssues.length;
  const firstGroupedIssue = useMemo(
    () =>
      DETAIL_SELECTION_STATUS_ORDER.map((status) =>
        visibleIssues.find((issue) => issue.status === status),
      ).find(Boolean) ?? null,
    [visibleIssues],
  );
  const selectedIssue = useMemo(
    () => visibleIssues.find((issue) => issue.id === selectedIssueId) ?? null,
    [selectedIssueId, visibleIssues],
  );

  const metrics = useMemo(() => {
    const total = projectSummary.data?.meta.total ?? project.data?.issueCount ?? projectIssues.length;
    const open = projectIssues.filter((issue) => issue.status === 'OPEN').length;
    const inProgress = projectIssues.filter((issue) => issue.status === 'IN_PROGRESS').length;
    const resolved = projectIssues.filter((issue) => issue.status === 'RESOLVED').length;
    const critical = projectIssues.filter((issue) => issue.priority === 'CRITICAL').length;
    const health = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return { total, open, inProgress, resolved, critical, health };
  }, [project.data?.issueCount, projectIssues, projectSummary.data?.meta.total]);

  useEffect(() => {
    if (projectView === 'overview' || detailClosed) {
      setSelectedIssueId(null);
      return;
    }
    if (visibleIssues.length === 0) {
      setSelectedIssueId(null);
      return;
    }
    if (!selectedIssueId || !visibleIssues.some((issue) => issue.id === selectedIssueId)) {
      setSelectedIssueId(firstGroupedIssue?.id ?? visibleIssues[0].id);
    }
  }, [detailClosed, firstGroupedIssue, projectView, selectedIssueId, visibleIssues]);

  useEffect(() => {
    const openCreateIssue = () => setCreating(true);
    window.addEventListener('issuehub:new-issue', openCreateIssue);
    return () => window.removeEventListener('issuehub:new-issue', openCreateIssue);
  }, []);

  useEffect(() => {
    const openMembers = () => setMembersOpen(true);
    window.addEventListener('issuehub:open-members', openMembers);
    return () => window.removeEventListener('issuehub:open-members', openMembers);
  }, []);

  const navigateProjectView = (view: ProjectView) => {
    const search = view === 'issues' ? '' : `?view=${view}`;
    navigate(`/projects/${projectId}${search}`, { replace: true });
  };

  const showOverview = () => {
    setProjectView('overview');
    setDetailClosed(true);
    navigateProjectView('overview');
  };

  const showIssues = () => {
    setProjectView('issues');
    setDetailClosed(false);
    navigateProjectView('issues');
  };

  const showMyWork = () => {
    setProjectView('my-work');
    setDetailClosed(false);
    navigateProjectView('my-work');
  };

  useEffect(() => {
    const requestedView = new URLSearchParams(location.search).get('view');
    if (requestedView === 'overview') {
      setProjectView('overview');
      setDetailClosed(true);
      return;
    }
    if (requestedView === 'my-work') {
      setProjectView('my-work');
      setDetailClosed(false);
      return;
    }

    if (!params.q && !params.status && !params.priority && !params.assignee) {
      setProjectView('issues');
      setDetailClosed(false);
    }
  }, [location.search, params.assignee, params.priority, params.q, params.status]);

  const handleIssueSelect = (issue: IssueRow) => {
    if (window.matchMedia('(min-width: 981px)').matches) {
      setDetailClosed(false);
      setSelectedIssueId(issue.id);
    } else {
      navigate(`/issues/${issue.id}`);
    }
  };

  if (project.error instanceof ApiError && project.error.status === 404) {
    return <NotFoundPage />;
  }

  if (project.isError) {
    return (
      <div className="main-content">
        <ErrorState
          title="Couldn't load this project"
          message={project.error instanceof Error ? project.error.message : undefined}
          onRetry={() => void project.refetch()}
        />
      </div>
    );
  }

  const projectKey = project.data?.key ?? '...';

  return (
    <div className={`issuehub-workspace ${selectedIssue ? '' : 'detail-closed'}`}>
      <header className="project-header">
        <div className="project-title-block">
          <div className="project-title-row">
            <span className="project-avatar">{projectKey.slice(0, 3)}</span>
            <div>
              <button
                type="button"
                className="project-title-button"
                onClick={() => navigate('/projects')}
                aria-label="Switch project"
              >
                <h1>{project.data?.name ?? 'Loading project'}</h1>
              </button>
              <p className="issuehub-project-meta">
                {projectKey} · {project.data?.memberCount ?? 0}{' '}
                {(project.data?.memberCount ?? 0) === 1 ? 'member' : 'members'}
              </p>
            </div>
          </div>
          <nav className="project-tabs" aria-label="Project navigation">
            <button
              type="button"
              className={`project-tab ${projectView === 'overview' ? 'active' : ''}`}
              onClick={showOverview}
            >
              Overview
            </button>
            <button
              type="button"
              className={`project-tab ${projectView === 'issues' || projectView === 'my-work' ? 'active' : ''}`}
              onClick={showIssues}
            >
              Issues
            </button>
            <button type="button" className="project-tab" onClick={() => setMembersOpen(true)}>
              Members
            </button>
            <button
              type="button"
              className="project-tab"
              onClick={() => toast.success('Files is not part of the current IssueHub workflow')}
            >
              Files
            </button>
          </nav>
        </div>
        <div className="header-actions">
          <label className="global-search">
            <SearchIcon />
            <input
              value={params.q ?? ''}
              onChange={(event) => setFilters({ ...params, q: event.target.value, page: 1 })}
              placeholder="Search issues, projects, people..."
            />
            <span className="keycap">⌘ K</span>
          </label>
          <span className="icon-wrap">
            <button
              type="button"
              className="icon-button"
              aria-label="Notifications"
              onClick={() => toast.success(`${metrics.critical} critical issues need attention`)}
            >
              <BellIcon />
            </button>
          </span>
          <button
            type="button"
            className="icon-button help-button"
            aria-label="Help"
            onClick={() => toast.success('Use search, filters, issue rows, and the detail panel to triage issues')}
          >
            <HelpIcon />
          </button>
          <button type="button" className="button primary" onClick={() => setCreating(true)}>
            <PlusIcon />
            <span className="new-issue-label">New Issue</span>
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="issuehub-project-summary">
          <p>{project.data?.description || 'Track, triage, assign and resolve issues for this project.'}</p>
          <button type="button" className="button secondary small" onClick={() => setMembersOpen(true)}>
            <UsersIcon />
            Members
          </button>
        </div>

        <div className="metric-grid">
          <MetricCard
            label="Open issues"
            value={metrics.open}
            status="OPEN"
            tone="#e33048"
            soft="#fff0f3"
            helper="Needs attention"
            onClick={() => {
              setProjectView('issues');
              setDetailClosed(false);
              setFilters({ ...params, status: 'OPEN', page: 1 });
            }}
          />
          <MetricCard
            label="In progress"
            value={metrics.inProgress}
            status="IN_PROGRESS"
            helper="Assigned"
            onClick={() => {
              setProjectView('issues');
              setDetailClosed(false);
              setFilters({ ...params, status: 'IN_PROGRESS', page: 1 });
            }}
          />
          <MetricCard
            label="Resolved"
            value={metrics.resolved}
            status="RESOLVED"
            tone="#12a66a"
            soft="#e9f9f1"
            helper="Done"
            onClick={() => {
              setProjectView('issues');
              setDetailClosed(false);
              setFilters({ ...params, status: 'RESOLVED', page: 1 });
            }}
          />
          <MetricCard
            label="Release health"
            value={`${metrics.health}%`}
            tone="#f58a16"
            soft="#fff4e6"
            helper={metrics.critical > 0 ? `${metrics.critical} blockers` : 'Healthy'}
          />
        </div>

        {projectView === 'overview' ? (
          <ProjectOverview
            issues={projectIssues}
            myWorkCount={myWorkTotal}
            memberCount={project.data?.memberCount ?? 0}
            memberNames={(members.data ?? []).map((member) => member.name)}
            metrics={metrics}
            onShowIssues={showIssues}
            onShowMembers={() => setMembersOpen(true)}
            onShowMyWork={showMyWork}
          />
        ) : (
          <>
            {projectView === 'my-work' && (
              <section className="issuehub-my-work-banner" aria-label="My work summary">
                <div>
                  <span className="issuehub-panel-kicker">My work</span>
                  <h2>Assigned to you or reported by you</h2>
                  <p>
                    {myWorkTotal} {myWorkTotal === 1 ? 'issue' : 'issues'} in this project
                  </p>
                </div>
                <button type="button" className="button secondary small" onClick={showIssues}>
                  Back to all issues
                </button>
              </section>
            )}

            <IssueFilters
              params={params}
              members={members.data ?? []}
              onChange={(next) => {
                setProjectView('issues');
                setDetailClosed(false);
                setFilters(next);
              }}
              onClear={() => {
                clearFilters();
                setDetailClosed(false);
              }}
              hasActiveFilters={hasActiveFilters}
            />

            <div className="issuehub-result-row">
              {activeIssueQuery.data && (
                <p aria-live="polite">
                  Showing {visibleIssues.length} of {visibleTotal}{' '}
                  {visibleTotal === 1 ? 'issue' : 'issues'}
                </p>
              )}
              {activeIssueQuery.isFetching && !activeIssueQuery.isPending && <p role="status">Updating...</p>}
            </div>

            {activeIssueQuery.isPending ? (
              <div className="issue-group">
                <SkeletonRows />
              </div>
            ) : activeIssueQuery.isError ? (
              <ErrorState
                title="Couldn't load issues"
                message={activeIssueQuery.error instanceof Error ? activeIssueQuery.error.message : undefined}
                onRetry={() => void activeIssueQuery.refetch()}
              />
            ) : visibleIssues.length === 0 ? (
              projectView === 'my-work' ? (
                <EmptyState
                  title="No work assigned or reported to you"
                  description="Use the full issue queue to review everything in this project."
                  action={
                    <button type="button" className="button secondary" onClick={showIssues}>
                      View all issues
                    </button>
                  }
                />
              ) : hasActiveFilters ? (
                <EmptyState
                  title="No issues match your filters"
                  description="Try a different search term, or clear the filters to see everything."
                  action={
                    <button type="button" className="button secondary" onClick={clearFilters}>
                      Clear filters
                    </button>
                  }
                />
              ) : (
                <EmptyState
                  title="No issues yet"
                  description="File the first issue for this project."
                  action={
                    <button type="button" className="button primary" onClick={() => setCreating(true)}>
                      New issue
                    </button>
                  }
                />
              )
            ) : (
              <>
                <div aria-busy={issues.isFetching || undefined}>
                  <IssueTable issues={visibleIssues} selectedIssueId={selectedIssueId} onIssueSelect={handleIssueSelect} />
                </div>
                {activeIssueQuery.data.meta.totalPages > 1 && (
                  <Pagination
                    page={activeIssueQuery.data.meta.page}
                    totalPages={activeIssueQuery.data.meta.totalPages}
                    onChange={(page) =>
                      setFilters({ ...params, page }, { preserveView: projectView === 'my-work' })
                    }
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {selectedIssue && (
        <IssueDetailsPanel
          issue={selectedIssue}
          projectId={projectId}
          canEdit={Boolean(isMaintainer || selectedIssue.reporter.id === user?.id)}
          canTriage={Boolean(isMaintainer)}
          onClose={() => {
            setDetailClosed(true);
            setSelectedIssueId(null);
          }}
        />
      )}

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
    </div>
  );
}
