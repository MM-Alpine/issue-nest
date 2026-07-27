import { useNavigate } from 'react-router-dom';
import type { IssueRow } from '../../types/api';
import { formatAge, initials, shortId } from '../../utils/format';
import { Avatar, PriorityBadge, StatusBadge } from './badges';

/**
 * A real <table> for semantics (docs/03 §9). Below 1024px the header hides and each row
 * lays out as a stacked card, which keeps one DOM structure instead of two components.
 */
export function IssueTable({ issues }: { issues: IssueRow[] }) {
  const navigate = useNavigate();

  return (
    <table className="w-full text-left">
      <caption className="sr-only">Issues in this project</caption>
      <thead className="hidden lg:table-header-group">
        <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <th scope="col" className="px-5 py-3">
            Issue
          </th>
          <th scope="col" className="px-4 py-3">
            Status
          </th>
          <th scope="col" className="px-4 py-3">
            Priority
          </th>
          <th scope="col" className="px-4 py-3">
            Assignee
          </th>
          <th scope="col" className="px-5 py-3 text-right">
            Updated
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 lg:divide-y">
        {issues.map((issue) => (
          <tr
            key={issue.id}
            onClick={() => navigate(`/issues/${issue.id}`)}
            className="group block cursor-pointer transition-[background-color,box-shadow] hover:bg-slate-50 focus-within:bg-slate-50 lg:table-row"
          >
            <td className="block px-4 pt-4 pb-2 lg:table-cell lg:max-w-md lg:px-5 lg:py-4">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-[11px] font-medium tracking-wide text-slate-400 uppercase">
                  {shortId(issue.id)}
                </span>
                <a
                  href={`/issues/${issue.id}`}
                  title={issue.title}
                  onClick={(e) => {
                    // The row already navigates; let modifier-clicks open a new tab.
                    if (!e.metaKey && !e.ctrlKey) e.preventDefault();
                  }}
                  className="block rounded text-[15px] font-semibold text-slate-900 group-hover:text-indigo-700 lg:truncate"
                >
                  {issue.title}
                </a>
                <span className="text-xs text-slate-500">
                  {issue.commentCount > 0
                    ? `${issue.commentCount} ${issue.commentCount === 1 ? 'comment' : 'comments'}`
                    : 'No comments'}
                </span>
              </div>
            </td>
            <td className="inline-flex px-4 py-1 align-middle lg:table-cell lg:px-4 lg:py-4">
              <StatusBadge status={issue.status} />
            </td>
            <td className="inline-flex px-0 py-1 align-middle lg:table-cell lg:px-4 lg:py-4">
              <PriorityBadge priority={issue.priority} />
            </td>
            <td className="block px-4 pt-2 pb-1 lg:table-cell lg:px-4 lg:py-4">
              {issue.assignee ? (
                <span className="flex items-center gap-2">
                  <Avatar name={initials(issue.assignee.name)} />
                  <span className="text-sm text-slate-700 lg:inline">
                    {issue.assignee.name}
                  </span>
                </span>
              ) : (
                <span className="text-sm text-slate-400">Unassigned</span>
              )}
            </td>
            <td className="block px-4 pt-1 pb-4 text-xs text-slate-500 lg:table-cell lg:px-5 lg:py-4 lg:text-right">
              <span className="lg:hidden">Updated </span>
              {formatAge(issue.updatedAt)}
              <span className="lg:hidden"> ago</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
