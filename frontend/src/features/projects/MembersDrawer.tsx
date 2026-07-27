import { useRef, useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { Drawer } from '../../components/Drawer';
import { inputClass } from '../../components/control-styles';
import { Field } from '../../components/Field';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/States';
import { useToast } from '../../components/toast-context';
import type { Role } from '../../types/api';
import { initials } from '../../utils/format';
import { Avatar, RoleChip } from '../issues/badges';
import { useAddMember, useMembers } from './hooks';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** Usability only — the API rejects a member's add attempt with 403 regardless. */
  canAddMembers: boolean;
}

export function MembersDrawer({ open, onClose, projectId, canAddMembers }: Props) {
  const toast = useToast();
  const members = useMembers(projectId, open);
  const addMember = useAddMember(projectId);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('MEMBER');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError('Enter a valid email address');
      window.requestAnimationFrame(() => emailRef.current?.focus());
      return;
    }
    setEmailError(undefined);

    addMember.mutate(
      { email: email.trim(), role },
      {
        onSuccess: (member) => {
          toast.success(`${member.name} added as ${member.role === 'MAINTAINER' ? 'Maintainer' : 'Member'}`);
          setEmail('');
          setRole('MEMBER');
        },
        onError: (error: unknown) => {
          if (error instanceof ApiError) {
            if (error.code === 'USER_NOT_FOUND') {
              setEmailError('No user with that email. They need to sign up first.');
              window.requestAnimationFrame(() => emailRef.current?.focus());
              return;
            }
            if (error.code === 'ALREADY_MEMBER') {
              setEmailError('Already a member of this project.');
              window.requestAnimationFrame(() => emailRef.current?.focus());
              return;
            }
            setEmailError(error.fieldError('email'));
            if (error.fieldError('email')) {
              window.requestAnimationFrame(() => emailRef.current?.focus());
            } else {
              setFormError(error.message);
            }
            return;
          }
          setFormError('Something went wrong. Please try again.');
        },
      },
    );
  };

  return (
    <Drawer open={open} onClose={onClose} title="Members">
      {members.isPending ? (
        <div className="flex flex-col gap-3" role="status" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="mt-1.5 h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      ) : members.isError ? (
        <ErrorState
          title="Couldn't load members"
          message={members.error instanceof Error ? members.error.message : undefined}
          onRetry={() => void members.refetch()}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {members.data?.length ?? 0} {(members.data?.length ?? 0) === 1 ? 'member' : 'members'}
            </p>
            <p className="pt-0.5 text-xs text-slate-500">Project access is scoped to this list.</p>
          </div>
          <ul className="flex flex-col gap-2">
            {members.data?.map((member) => (
              <li
                key={member.userId}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
              >
                <Avatar name={initials(member.name)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{member.name}</p>
                  <p className="truncate text-xs text-slate-500">{member.email}</p>
                </div>
                <RoleChip role={member.role} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <hr className="my-6 border-slate-200" />

      {canAddMembers ? (
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Add a member</h3>
            <p className="pt-0.5 text-xs text-slate-500">
              The user must already have an account.
            </p>
          </div>

          <Field
            id="member-email"
            label="Email"
            error={emailError}
            hint="Use the email address they signed up with"
          >
            <input
              id="member-email"
              type="email"
              ref={emailRef}
              data-autofocus
              className={inputClass(Boolean(emailError))}
              value={email}
              aria-invalid={Boolean(emailError)}
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError(undefined);
              }}
            />
          </Field>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[13px] font-medium text-slate-700">Role</legend>
            <div className="grid gap-2 pt-1">
              {(['MEMBER', 'MAINTAINER'] as Role[]).map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    role === option
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="member-role"
                    value={option}
                    checked={role === option}
                    onChange={() => setRole(option)}
                    className="mt-0.5 h-4 w-4 accent-indigo-600"
                  />
                  <span>
                    <span className="block font-medium">
                      {option === 'MEMBER' ? 'Member' : 'Maintainer'}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {option === 'MEMBER'
                        ? 'Can create issues and comment.'
                        : 'Can assign, close, delete, and add members.'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {formError && <Alert>{formError}</Alert>}

          <Button type="submit" pending={addMember.isPending} className="self-start">
            Add member
          </Button>
        </form>
      ) : (
        <p className="text-xs text-slate-500">Only maintainers can add members.</p>
      )}
    </Drawer>
  );
}
