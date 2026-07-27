import { useState } from 'react';
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

  return (
    <>
      <div className="flex items-center justify-between gap-4 pb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
        <Button onClick={() => setCreating(true)}>
          <PlusIcon />
          New project
        </Button>
      </div>

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
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.data.map((project) => (
            <li key={project.id}>
              {/* The whole card is one link (docs/03 §5.3). */}
              <Link
                to={`/projects/${project.id}`}
                className="flex h-full flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 sm:p-6"
              >
                <span className="font-mono text-xs text-slate-500">{project.key}</span>
                <h2 className="text-base font-semibold text-slate-900">{project.name}</h2>
                <p className="line-clamp-2 flex-1 text-sm text-slate-500">
                  {project.description ?? 'No description'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <RoleChip role={project.role} />
                  <span className="text-xs text-slate-500">
                    {project.issueCount} {project.issueCount === 1 ? 'issue' : 'issues'}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateProjectModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
