import { Link } from 'react-router-dom';
import { AlertIcon } from '../components/icons';

/**
 * One page for both "404" and "you are not a member", deliberately ambiguous so it
 * matches the API's 404-for-non-members rule (docs/03 §5.6).
 */
export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white px-6 py-16 text-center">
      <span className="text-slate-300">
        <AlertIcon className="h-10 w-10" />
      </span>
      <h1 className="text-lg font-semibold text-slate-900">We couldn&rsquo;t find that page</h1>
      <p className="max-w-sm text-sm text-slate-500">
        It may have been deleted, or you may not have access to it.
      </p>
      <Link
        to="/projects"
        className="mt-2 inline-flex h-9 items-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
      >
        Back to projects
      </Link>
    </div>
  );
}
