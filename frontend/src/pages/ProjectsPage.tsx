import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { PlusIcon } from '../components/icons';
import { SkeletonCards } from '../components/Skeleton';
import { EmptyState, ErrorState } from '../components/States';
import { RoleChip } from '../features/issues/badges';
import { CreateProjectModal } from '../features/projects/CreateProjectModal';
import { useProjects } from '../features/projects/hooks';

export function ProjectsPage() {
  const projects = useProjects();
  const [creating, setCreating] = useState(false);
  const totalIssues = projects.data?.reduce((sum, project) => sum + project.issueCount, 0) ?? 0;
  const maintainerCount =
    projects.data?.filter((project) => project.role === 'MAINTAINER').length ?? 0;

  useEffect(() => {
    const openCreateProject = () => setCreating(true);
    window.addEventListener('issuehub:create-project', openCreateProject);

    if (sessionStorage.getItem('issuehub:create-project') === '1') {
      sessionStorage.removeItem('issuehub:create-project');
      setCreating(true);
    }

    return () => window.removeEventListener('issuehub:create-project', openCreateProject);
  }, []);

  return (
    <main className="main-content issuehub-projects-view">
      <div className="issuehub-projects-head">
        <div>
          <div className="auth-eyebrow">Workspace</div>
          <h1>Projects</h1>
          <p>
            {projects.data
              ? `${projects.data.length} ${projects.data.length === 1 ? 'project' : 'projects'} · ${totalIssues} ${
                  totalIssues === 1 ? 'issue' : 'issues'
                }`
              : 'Choose a project or create a new workspace.'}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <PlusIcon />
          Create project
        </Button>
      </div>

      {projects.data && projects.data.length > 0 && (
        <div className="metric-grid issuehub-project-metrics">
          <div className="metric-card">
            <div className="metric-label">Active projects</div>
            <div className="metric-value">{projects.data.length}</div>
            <div className="metric-foot">Workspaces with issue queues</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Tracked issues</div>
            <div className="metric-value">{totalIssues}</div>
            <div className="metric-foot">Across all projects</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Maintainer access</div>
            <div className="metric-value">{maintainerCount}</div>
            <div className="metric-foot">Projects you can manage</div>
          </div>
        </div>
      )}

      {projects.isPending ? (
        <SkeletonCards />
      ) : projects.isError ? (
        <ErrorState
          title="Couldn't load projects"
          message={projects.error instanceof Error ? projects.error.message : undefined}
          onRetry={() => void projects.refetch()}
        />
      ) : projects.data.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project to start tracking issues."
          action={<Button onClick={() => setCreating(true)}>Create a project</Button>}
        />
      ) : (
        <div className="issuehub-project-card-grid">
          {projects.data.map((project, index) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="issuehub-project-card"
              style={{ '--project-colour': index === 0 ? '#5b56e9' : index === 1 ? '#17b66a' : '#1769ff' } as CSSProperties}
            >
              <span className="project-avatar">{project.key.slice(0, 3)}</span>
              <strong>{project.name}</strong>
              <span>{project.description ?? 'No description'}</span>
              <div>
                <RoleChip role={project.role} />
                <span>
                  <b>{project.issueCount}</b> {project.issueCount === 1 ? 'issue' : 'issues'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectModal open={creating} onClose={() => setCreating(false)} />
    </main>
  );
}
