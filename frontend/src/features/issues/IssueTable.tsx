import { useNavigate } from 'react-router-dom';
import type { IssueRow } from '../../types/api';
import { formatAge, initials } from '../../utils/format';
import { Avatar, PriorityBadge, StatusBadge } from './badges';

/**
 * A real <table> for semantics (docs/03 §9). Below 768px the header hides and each row
 * lays out as a stacked card, which keeps one DOM structure instead of two components.
 */
export function IssueTable({ issues }: { issues: IssueRow[] }) {
  const navigate = useNavigate();

  return (
    <table className="w-full text-left">
      <caption className="sr-only">Issues in this project</caption>
      <thead className="hidden md:table-header-group">
        <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
          <th scope="col" className="px-4 py-2.5">
            Title
          </th>
          <th scope="col" className="px-4 py-2.5">
            Status
          </th>
          <th scope="col" className="px-4 py-2.5">
            Priority
          </th>
          <th scope="col" className="px-4 py-2.5">
            Assignee
          </th>
          <th scope="col" className="px-4 py-2.5">
            Age
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200">
        {issues.map((issue) => (
          <tr
            key={issue.id}
            onClick={() => navigate(`/issues/${issue.id}`)}
            className="block cursor-pointer hover:bg-slate-50 md:table-row"
          >
            <td className="block px-4 pt-3 pb-1 md:table-cell md:max-w-md md:py-3">
              <a
                href={`/issues/${issue.id}`}
                title={issue.title}
                onClick={(e) => {
                  // The row already navigates; let modifier-clicks open a new tab.
                  if (!e.metaKey && !e.ctrlKey) e.preventDefault();
                }}
                className="block truncate rounded font-medium text-slate-900"
              >
                {issue.title}
              </a>
              {issue.commentCount > 0 && (
                <span className="text-xs text-slate-500">
                  {issue.commentCount} {issue.commentCount === 1 ? 'comment' : 'comments'}
                </span>
              )}
            </td>
            <td className="block px-4 py-1 md:table-cell md:py-3">
              <StatusBadge status={issue.status} />
            </td>
            <td className="block px-4 py-1 md:table-cell md:py-3">
              <PriorityBadge priority={issue.priority} />
            </td>
            <td className="block px-4 py-1 md:table-cell md:py-3">
              {issue.assignee ? (
                <span className="flex items-center gap-2">
                  <Avatar name={initials(issue.assignee.name)} />
                  <span className="text-sm text-slate-700 md:hidden lg:inline">
                    {issue.assignee.name}
                  </span>
                </span>
              ) : (
                <span className="text-sm text-slate-400">Unassigned</span>
              )}
            </td>
            <td className="block px-4 pt-1 pb-3 text-xs text-slate-500 md:table-cell md:py-3">
              <span className="md:hidden">Opened </span>
              {formatAge(issue.createdAt)}
              <span className="md:hidden"> ago</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
