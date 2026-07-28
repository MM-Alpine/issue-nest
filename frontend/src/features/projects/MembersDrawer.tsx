import { useState } from 'react';
import { ApiError } from '../../api/client';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { Drawer } from '../../components/Drawer';
import { Skeleton } from '../../components/Skeleton';
import { ErrorState } from '../../components/States';
import { useToast } from '../../components/toast-context';
import type { MemberCandidate, Role } from '../../types/api';
import { initials } from '../../utils/format';
import { useAuth } from '../auth/auth-context';
import { Avatar, RoleChip } from '../issues/badges';
import {
  useAddMember,
  useMemberCandidates,
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from './hooks';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  /** Usability only — the API rejects a member's add attempt with 403 regardless. */
  canAddMembers: boolean;
}

export function MembersDrawer({ open, onClose, projectId, canAddMembers }: Props) {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const members = useMembers(projectId, open);
  const candidates = useMemberCandidates(projectId, open && canAddMembers);
  const addMember = useAddMember(projectId);
  const updateMemberRole = useUpdateMemberRole(projectId);
  const removeMember = useRemoveMember(projectId);

  const [role, setRole] = useState<Role>('MEMBER');
  const [formError, setFormError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingMemberAction, setPendingMemberAction] = useState<string | null>(null);
  const [confirmRemoveUserId, setConfirmRemoveUserId] = useState<string | null>(null);

  const memberActionError = (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.code === 'LAST_MAINTAINER') {
        setMemberError('A project must have at least one maintainer.');
        return;
      }
      setMemberError(error.message);
      return;
    }
    setMemberError('Something went wrong. Please try again.');
  };

  const changeRole = (userId: string, nextRole: Role) => {
    setMemberError(null);
    setPendingMemberAction(`role:${userId}`);
    updateMemberRole.mutate(
      { userId, role: nextRole },
      {
        onSuccess: (member) => {
          toast.success(`${member.name} is now ${member.role === 'MAINTAINER' ? 'a Maintainer' : 'a Member'}`);
        },
        onError: memberActionError,
        onSettled: () => setPendingMemberAction(null),
      },
    );
  };

  const removeProjectMember = (userId: string, name: string) => {
    setMemberError(null);
    setPendingMemberAction(`remove:${userId}`);
    removeMember.mutate(userId, {
      onSuccess: () => {
        toast.success(`${name} removed from this project`);
        setConfirmRemoveUserId(null);
      },
      onError: memberActionError,
      onSettled: () => setPendingMemberAction(null),
    });
  };

  const addCandidate = (user: MemberCandidate) => {
    setFormError(null);
    setPendingUserId(user.id);

    addMember.mutate(
      { userId: user.id, role },
      {
        onSuccess: (member) => {
          toast.success(`${member.name} added as ${member.role === 'MAINTAINER' ? 'Maintainer' : 'Member'}`);
          setRole('MEMBER');
        },
        onError: (error: unknown) => {
          if (error instanceof ApiError) {
            if (error.code === 'ALREADY_MEMBER') {
              setFormError('That user is already a member of this project.');
              return;
            }
            if (error.code === 'USER_NOT_FOUND') {
              setFormError('That user account is no longer available.');
              return;
            }
            setFormError(error.message);
            return;
          }
          setFormError('Something went wrong. Please try again.');
        },
        onSettled: () => setPendingUserId(null),
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
          {memberError && <Alert>{memberError}</Alert>}
          <ul className="flex flex-col gap-2">
            {members.data?.map((member) => {
              const isCurrentUser = member.userId === currentUser?.id;
              const rolePending = pendingMemberAction === `role:${member.userId}`;
              const removePending = pendingMemberAction === `remove:${member.userId}`;
              const disableControls = rolePending || removePending || updateMemberRole.isPending || removeMember.isPending;

              return (
                <li
                  key={member.userId}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={initials(member.name)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {member.name}
                        {isCurrentUser && <span className="pl-1 text-xs font-normal text-slate-500">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-slate-500">{member.email}</p>
                    </div>
                    {canAddMembers ? (
                      <select
                        aria-label={`Change role for ${member.name}`}
                        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
                        value={member.role}
                        disabled={disableControls || isCurrentUser}
                        onChange={(event) => changeRole(member.userId, event.target.value as Role)}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="MAINTAINER">Maintainer</option>
                      </select>
                    ) : (
                      <RoleChip role={member.role} />
                    )}
                  </div>
                  {canAddMembers && !isCurrentUser && (
                    <div className="mt-2 flex justify-end gap-2">
                      {confirmRemoveUserId === member.userId ? (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            className="small"
                            disabled={removePending}
                            onClick={() => setConfirmRemoveUserId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            pending={removePending}
                            className="small"
                            onClick={() => removeProjectMember(member.userId, member.name)}
                          >
                            Confirm remove
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          className="small text-red-600 hover:text-red-700"
                          disabled={disableControls}
                          onClick={() => setConfirmRemoveUserId(member.userId)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <hr className="my-6 border-slate-200" />

      {canAddMembers ? (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Add a member</h3>
            <p className="pt-0.5 text-xs text-slate-500">
              Select an existing user and choose their project role.
            </p>
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-[13px] font-medium text-slate-700">Role</legend>
            <div className="grid gap-2 pt-1">
              {(['MEMBER', 'MAINTAINER'] as Role[]).map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    role === option
                      ? 'border-blue-200 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="member-role"
                    value={option}
                    checked={role === option}
                    onChange={() => setRole(option)}
                    className="mt-0.5 h-4 w-4 accent-blue-600"
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

          {candidates.isPending ? (
            <div className="flex flex-col gap-2" role="status" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                >
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="mt-1.5 h-3 w-40" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
              ))}
            </div>
          ) : candidates.isError ? (
            <ErrorState
              title="Couldn't load available users"
              message={candidates.error instanceof Error ? candidates.error.message : undefined}
              onRetry={() => void candidates.refetch()}
            />
          ) : (candidates.data?.length ?? 0) > 0 ? (
            <ul className="flex max-h-80 flex-col gap-2 overflow-auto pr-1">
              {candidates.data?.map((user) => {
                const pending = pendingUserId === user.id && addMember.isPending;
                return (
                  <li
                    key={user.id}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                  >
                    <Avatar name={initials(user.name)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      pending={pending}
                      disabled={addMember.isPending}
                      className="small"
                      onClick={() => addCandidate(user)}
                    >
                      Add
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
              No available users to add.
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500">Only maintainers can add members.</p>
      )}
    </Drawer>
  );
}
