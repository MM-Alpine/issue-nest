import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
import { controlClass } from '../../components/control-styles';
import { CloseIcon, SearchIcon } from '../../components/icons';
import { Modal } from '../../components/Modal';
import {
  asOneOf,
  ISSUE_PRIORITIES,
  ISSUE_SORTS,
  ISSUE_STATUSES,
  SORT_ORDERS,
  type IssueListParams,
  type Member,
} from '../../types/api';
import { PRIORITY_META, SORT_OPTIONS, STATUS_META } from '../../utils/labels';

interface Props {
  params: IssueListParams;
  members: Member[];
  onChange: (patch: Partial<IssueListParams>) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

const selectClass = `${controlClass()} h-9 pr-8 sm:w-[10.5rem]`;

export function IssueFilters({ params, members, onChange, onClear, hasActiveFilters }: Props) {
  const [search, setSearch] = useState(params.q ?? '');
  const [sheetOpen, setSheetOpen] = useState(false);
  const sortValue = `${params.sort ?? 'createdAt'}:${params.order ?? 'desc'}`;

  // Keep the input in step when the URL changes from outside (Clear filters, back button).
  useEffect(() => {
    setSearch(params.q ?? '');
  }, [params.q]);

  // Debounced 300ms, then written to the URL (docs/03 §5.4).
  useEffect(() => {
    const current = params.q ?? '';
    if (search === current) return;
    const timer = window.setTimeout(() => onChange({ q: search || undefined }), 300);
    return () => window.clearTimeout(timer);
  }, [search, params.q, onChange]);

  const activeFilters = [
    params.q ? { label: `Search: ${params.q}`, patch: { q: undefined } } : null,
    params.status
      ? { label: `Status: ${STATUS_META[params.status].label}`, patch: { status: undefined } }
      : null,
    params.priority
      ? {
          label: `Priority: ${PRIORITY_META[params.priority].label}`,
          patch: { priority: undefined },
        }
      : null,
    params.assignee
      ? {
          label:
            params.assignee === 'unassigned'
              ? 'Assignee: Unassigned'
              : `Assignee: ${members.find((member) => member.userId === params.assignee)?.name ?? 'Selected'}`,
          patch: { assignee: undefined },
        }
      : null,
  ].filter(Boolean) as { label: string; patch: Partial<IssueListParams> }[];

  const renderControls = (idPrefix: string, autoFocus = false, visibleLabels = false) => (
    <>
      <label
        className={visibleLabels ? 'text-[13px] font-medium text-slate-700' : 'sr-only'}
        htmlFor={`${idPrefix}-status`}
      >
        Status
      </label>
      <select
        id={`${idPrefix}-status`}
        className={selectClass}
        data-autofocus={autoFocus || undefined}
        value={params.status ?? ''}
        onChange={(e) => onChange({ status: asOneOf(e.target.value, ISSUE_STATUSES) })}
      >
        <option value="">All statuses</option>
        {ISSUE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_META[status].label}
          </option>
        ))}
      </select>

      <label
        className={visibleLabels ? 'text-[13px] font-medium text-slate-700' : 'sr-only'}
        htmlFor={`${idPrefix}-priority`}
      >
        Priority
      </label>
      <select
        id={`${idPrefix}-priority`}
        className={selectClass}
        value={params.priority ?? ''}
        onChange={(e) => onChange({ priority: asOneOf(e.target.value, ISSUE_PRIORITIES) })}
      >
        <option value="">All priorities</option>
        {ISSUE_PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_META[priority].label}
          </option>
        ))}
      </select>

      <label
        className={visibleLabels ? 'text-[13px] font-medium text-slate-700' : 'sr-only'}
        htmlFor={`${idPrefix}-assignee`}
      >
        Assignee
      </label>
      <select
        id={`${idPrefix}-assignee`}
        className={selectClass}
        value={params.assignee ?? ''}
        onChange={(e) => onChange({ assignee: e.target.value || undefined })}
      >
        <option value="">All assignees</option>
        <option value="unassigned">Unassigned</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.name}
          </option>
        ))}
      </select>

      <label
        className={visibleLabels ? 'text-[13px] font-medium text-slate-700' : 'sr-only'}
        htmlFor={`${idPrefix}-sort`}
      >
        Sort
      </label>
      <select
        id={`${idPrefix}-sort`}
        className={selectClass}
        value={sortValue}
        onChange={(e) => {
          const [sort, order] = e.target.value.split(':');
          onChange({
            sort: asOneOf(sort, ISSUE_SORTS) ?? 'createdAt',
            order: asOneOf(order, SORT_ORDERS) ?? 'desc',
          });
        }}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:sticky md:top-[4.5rem] md:z-20">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 lg:max-w-sm">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
          <label className="sr-only" htmlFor="filter-search">
            Search issue titles
          </label>
          <input
            id="filter-search"
            type="search"
            placeholder="Search title…"
            className={`${controlClass()} h-9 pl-9`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Inline from 640px; behind a sheet below it (docs/03 §8). */}
        <div className="hidden flex-wrap items-center gap-2 sm:flex">
          {renderControls('filter-inline')}
        </div>

        <Button variant="secondary" className="sm:hidden" onClick={() => setSheetOpen(true)}>
          Filters
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" className="sm:ml-auto" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-medium text-slate-500">Active</span>
          {activeFilters.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => onChange(filter.patch)}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:border-indigo-200 hover:bg-indigo-100"
            >
              <span className="truncate">{filter.label}</span>
              <CloseIcon className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}

      <Modal
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        footer={<Button onClick={() => setSheetOpen(false)}>Done</Button>}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">Refine the issue list without leaving the project.</p>
          {renderControls('filter-sheet', true, true)}
          {hasActiveFilters && (
            <Button variant="secondary" onClick={onClear}>
              Clear filters
            </Button>
          )}
        </div>
      </Modal>
    </div>
  );
}
