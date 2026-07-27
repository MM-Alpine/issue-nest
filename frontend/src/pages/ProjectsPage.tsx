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
  const totalIssues = projects.data?.reduce((sum, project) => sum + project.issueCount, 0) ?? 0;

  return (
    <>
      <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
          <p className="pt-1 text-sm text-slate-500">
            {projects.data
              ? `${projects.data.length} ${projects.data.length === 1 ? 'project' : 'projects'} · ${totalIssues} ${
                  totalIssues === 1 ? 'issue' : 'issues'
                }`
              : 'Your issue-tracking workspaces'}
          </p>
        </div>
        <Button className="self-start sm:self-auto" onClick={() => setCreating(true)}>
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
                className="group flex h-full flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-medium text-slate-600">
                    {project.key}
                  </span>
                  <RoleChip role={project.role} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold text-slate-900 group-hover:text-indigo-700">
                    {project.name}
                  </h2>
                  <p className="line-clamp-2 pt-1 text-sm text-slate-500">
                    {project.description ?? 'No description'}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs font-medium text-slate-600">
                    {project.issueCount} {project.issueCount === 1 ? 'issue' : 'issues'}
                  </span>
                  <span className="text-xs text-slate-400 transition-colors group-hover:text-indigo-600">
                    View
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
