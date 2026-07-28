import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import type { CreateIssueInput, UpdateIssueInput } from '../../api/issues';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { controlClass, inputClass } from '../../components/control-styles';
import { Field } from '../../components/Field';
import { Modal } from '../../components/Modal';
import {
  ISSUE_PRIORITIES,
  type IssuePriority,
  type Member,
} from '../../types/api';
import { PRIORITY_META } from '../../utils/labels';

export interface IssueFormValues {
  title: string;
  description: string;
  priority: IssuePriority;
  assigneeId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  members: Member[];
  /** Assignee is rendered only for maintainers; the server enforces it either way. */
  canAssign: boolean;
  initial?: Partial<IssueFormValues>;
  pending: boolean;
  error: unknown;
  onSubmit: (values: CreateIssueInput & UpdateIssueInput) => void;
}

const EMPTY: IssueFormValues = {
  title: '',
  description: '',
  priority: 'MEDIUM',
  assigneeId: '',
};

export function IssueFormModal({
  open,
  onClose,
  mode,
  members,
  canAssign,
  initial,
  pending,
  error,
  onSubmit,
}: Props) {
  const [values, setValues] = useState<IssueFormValues>({ ...EMPTY, ...initial });
  const [titleError, setTitleError] = useState<string | undefined>();
  const [dirty, setDirty] = useState(false);
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setValues({ ...EMPTY, ...initial });
      setTitleError(undefined);
      setDirty(false);
    }
    // `initial` is a fresh object each render; keying off `open` is what we want.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const apiError = error instanceof ApiError ? error : null;
  const formError =
    apiError && !apiError.details && apiError.code !== 'VALIDATION_ERROR' ? apiError.message : null;

  const requestClose = () => {
    if (dirty && !window.confirm('Discard your changes?')) return;
    onClose();
  };

  const update = <K extends keyof IssueFormValues>(key: K, value: IssueFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (values.title.trim().length === 0) {
      setTitleError('Title is required');
      window.requestAnimationFrame(() => titleRef.current?.focus());
      return;
    }
    setTitleError(undefined);

    onSubmit({
      title: values.title.trim(),
      description: values.description.trim() ? values.description.trim() : null,
      priority: values.priority,
      // Omitted entirely for members — supplying the key at all is maintainer-only.
      ...(canAssign ? { assigneeId: values.assigneeId || null } : {}),
    });
  };

  return (
    <Modal
      open={open}
      onClose={requestClose}
      title={mode === 'create' ? 'New issue' : 'Edit issue'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={requestClose}>
            Cancel
          </Button>
          <Button type="submit" form="issue-form" pending={pending}>
            {mode === 'create' ? 'Create issue' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id="issue-form" className="issuehub-issue-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <Field
            id="issue-title"
            label="Title"
            error={titleError ?? apiError?.fieldError('title')}
            hint={`${values.title.length}/200`}
            full
          >
            <input
              id="issue-title"
              ref={titleRef}
              data-autofocus
              maxLength={200}
              autoFocus
              className={inputClass(Boolean(titleError ?? apiError?.fieldError('title')))}
              value={values.title}
              aria-invalid={Boolean(titleError ?? apiError?.fieldError('title'))}
              onChange={(e) => {
                update('title', e.target.value);
                setTitleError(undefined);
              }}
            />
          </Field>

          <Field
            id="issue-description"
            label="Description"
            error={apiError?.fieldError('description')}
            hint={`${values.description.length}/5000 · Optional`}
            full
          >
            <textarea
              id="issue-description"
              rows={7}
              maxLength={5000}
              className={`${controlClass()} min-h-40 resize-y py-2`}
              value={values.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </Field>

          <Field id="issue-priority" label="Priority">
            <select
              id="issue-priority"
              className={`${controlClass()} h-9`}
              value={values.priority}
              onChange={(e) => update('priority', e.target.value as IssuePriority)}
            >
              {ISSUE_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_META[priority].label}
                </option>
              ))}
            </select>
          </Field>

          {canAssign ? (
            <Field id="issue-assignee" label="Assignee">
              <select
                id="issue-assignee"
                className={`${controlClass()} h-9`}
                value={values.assigneeId}
                onChange={(e) => update('assigneeId', e.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <p className="helper">Maintainers assign issue owners after creation.</p>
          )}
        </div>

        {formError && <Alert>{formError}</Alert>}
      </form>
    </Modal>
  );
}
