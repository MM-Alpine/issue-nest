import { useEffect, useState } from 'react';
import { Button } from '../../components/Button';
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
      <span className="filter-control">
        <select
          id={`${idPrefix}-status`}
          data-autofocus={autoFocus || undefined}
          value={params.status ?? ''}
          onChange={(e) => onChange({ status: asOneOf(e.target.value, ISSUE_STATUSES) })}
        >
          <option value="">Status</option>
          {ISSUE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_META[status].label}
            </option>
          ))}
        </select>
      </span>

      <label
        className={visibleLabels ? 'text-[13px] font-medium text-slate-700' : 'sr-only'}
        htmlFor={`${idPrefix}-priority`}
      >
        Priority
      </label>
      <span className="filter-control">
        <select
          id={`${idPrefix}-priority`}
          value={params.priority ?? ''}
          onChange={(e) => onChange({ priority: asOneOf(e.target.value, ISSUE_PRIORITIES) })}
        >
          <option value="">Priority</option>
          {ISSUE_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_META[priority].label}
            </option>
          ))}
        </select>
      </span>

      <label
        className={visibleLabels ? 'text-[13px] font-medium text-slate-700' : 'sr-only'}
        htmlFor={`${idPrefix}-assignee`}
      >
        Assignee
      </label>
      <span className="filter-control">
        <select
          id={`${idPrefix}-assignee`}
          value={params.assignee ?? ''}
          onChange={(e) => onChange({ assignee: e.target.value || undefined })}
        >
          <option value="">Assignee</option>
          <option value="unassigned">Unassigned</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.name}
            </option>
          ))}
        </select>
      </span>

      <label
        className={visibleLabels ? 'text-[13px] font-medium text-slate-700' : 'sr-only'}
        htmlFor={`${idPrefix}-sort`}
      >
        Sort
      </label>
      <span className="filter-control">
        <select
          id={`${idPrefix}-sort`}
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
      </span>
    </>
  );

  return (
    <div>
      <div className="issue-toolbar">
        <label className="search-control" htmlFor="filter-search">
          <SearchIcon />
          <input
            id="filter-search"
            type="search"
            aria-label="Search issue titles"
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        {/* Inline from 640px; behind a sheet below it (docs/03 §8). */}
        <div className="issuehub-desktop-filters">
          {renderControls('filter-inline')}
        </div>

        <Button variant="secondary" className="issuehub-mobile-filter-button" onClick={() => setSheetOpen(true)}>
          Filters
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={onClear}>
            Clear filters
          </Button>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="active-filters">
          {activeFilters.map((filter) => (
            <span key={filter.label} className="filter-chip">
              <span className="truncate">{filter.label}</span>
              <button type="button" onClick={() => onChange(filter.patch)} aria-label={`Remove ${filter.label}`}>
                <CloseIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button type="button" className="button ghost small" onClick={onClear}>
            Clear all
          </button>
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
