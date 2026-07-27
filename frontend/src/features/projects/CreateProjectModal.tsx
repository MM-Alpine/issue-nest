import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { controlClass, inputClass } from '../../components/control-styles';
import { Field } from '../../components/Field';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/toast-context';
import { useCreateProject } from './hooks';

const KEY_PATTERN = /^[A-Z][A-Z0-9]{1,9}$/;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateProjectModal({ open, onClose }: Props) {
  const toast = useToast();
  const createProject = useCreateProject();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string; key?: string; description?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setKey('');
    setDescription('');
    setErrors({});
    setFormError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    const next: typeof errors = {};
    if (name.trim().length === 0) next.name = 'Name is required';
    if (!KEY_PATTERN.test(key)) next.key = '2–10 letters or digits, starting with a letter';
    if (description.length > 1000) next.description = 'Description must be at most 1000 characters';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    createProject.mutate(
      {
        name: name.trim(),
        key,
        ...(description.trim() ? { description: description.trim() } : {}),
      },
      {
        onSuccess: (project) => {
          toast.success(`Project ${project.key} created`);
          close();
        },
        onError: (error: unknown) => {
          if (error instanceof ApiError) {
            if (error.code === 'PROJECT_KEY_TAKEN') {
              setErrors({ key: 'That key is already taken.' });
              return;
            }
            if (error.details) {
              setErrors({
                name: error.fieldError('name'),
                key: error.fieldError('key'),
                description: error.fieldError('description'),
              });
              return;
            }
            setFormError(error.message);
            return;
          }
          setFormError('Something went wrong. Please try again.');
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="New project"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="create-project-form" pending={createProject.isPending}>
            Create project
          </Button>
        </>
      }
    >
      <form id="create-project-form" className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <Field id="project-name" label="Name" error={errors.name}>
          <input
            id="project-name"
            className={inputClass(Boolean(errors.name))}
            value={name}
            aria-invalid={Boolean(errors.name)}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((s) => ({ ...s, name: undefined }));
            }}
          />
        </Field>

        <Field
          id="project-key"
          label="Key"
          error={errors.key}
          hint="2–10 letters or digits, e.g. WEB"
        >
          <input
            id="project-key"
            className={`${inputClass(Boolean(errors.key))} font-mono uppercase`}
            value={key}
            maxLength={10}
            aria-invalid={Boolean(errors.key)}
            onChange={(e) => {
              setKey(e.target.value.toUpperCase());
              setErrors((s) => ({ ...s, key: undefined }));
            }}
          />
        </Field>

        <Field
          id="project-description"
          label="Description"
          error={errors.description}
          hint="Optional"
        >
          <textarea
            id="project-description"
            rows={3}
            className={`${controlClass(Boolean(errors.description))} py-2`}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setErrors((s) => ({ ...s, description: undefined }));
            }}
          />
        </Field>

        {formError && <Alert>{formError}</Alert>}
      </form>
    </Modal>
  );
}
