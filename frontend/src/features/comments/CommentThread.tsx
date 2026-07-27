import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { Alert } from '../../components/Alert';
import { Button } from '../../components/Button';
import { controlClass } from '../../components/control-styles';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState, ErrorState } from '../../components/States';
import { useToast } from '../../components/toast-context';
import { formatRelative, initials } from '../../utils/format';
import { Avatar } from '../issues/badges';
import { useAddComment, useComments } from './hooks';

export function CommentThread({ issueId }: { issueId: string }) {
  const toast = useToast();
  const comments = useComments(issueId);
  const addComment = useAddComment(issueId);

  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmed = body.trim();
    if (trimmed.length === 0) return;

    addComment.mutate(trimmed, {
      onSuccess: () => {
        setBody('');
        toast.success('Comment added');
      },
      onError: (mutationError) => {
        setError(
          mutationError instanceof ApiError
            ? (mutationError.fieldError('body') ?? mutationError.message)
            : 'Something went wrong. Please try again.',
        );
      },
    });
  };

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="comments-heading" className="text-base font-semibold text-slate-900">
          Comments{comments.data ? ` · ${comments.data.length}` : ''}
        </h2>
        {comments.isFetching && !comments.isPending && (
          <span className="text-xs text-slate-400" role="status">
            Updating...
          </span>
        )}
      </div>

      {comments.isPending ? (
        <div className="flex flex-col gap-4" role="status" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-7 w-7 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3 w-40" />
                <Skeleton className="mt-2 h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.isError ? (
        <ErrorState
          title="Couldn't load comments"
          message={comments.error instanceof Error ? comments.error.message : undefined}
          onRetry={() => void comments.refetch()}
        />
      ) : comments.data.length === 0 ? (
        <EmptyState title="No comments yet" description="Start the conversation." />
      ) : (
        /* Oldest first — a thread reads downward (docs/05 §2.5). */
        <ul className="flex flex-col divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
          {comments.data.map((comment) => (
            <li key={comment.id} className="flex gap-3 p-4 transition-colors hover:bg-slate-50/70">
              <Avatar name={initials(comment.author.name)} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{comment.author.name}</span> ·{' '}
                  <time dateTime={comment.createdAt}>{formatRelative(comment.createdAt)}</time>
                </p>
                <p className="pt-1 text-sm whitespace-pre-wrap text-slate-800">{comment.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm" onSubmit={onSubmit}>
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">Add a comment</p>
          <p className="pt-0.5 text-xs text-slate-500">Comments are visible to project members.</p>
        </div>
        <label htmlFor="comment-body" className="sr-only">
          Write a comment
        </label>
        <textarea
          id="comment-body"
          rows={3}
          maxLength={5000}
          placeholder="Write a comment…"
          className={`${controlClass()} min-h-28 resize-y border-0 py-3 shadow-none focus:border-0`}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setError(null);
          }}
        />
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">{body.trim().length}/5000</p>
          <Button
            type="submit"
            className="self-end"
            disabled={body.trim().length === 0}
            pending={addComment.isPending}
          >
            Comment
          </Button>
        </div>
        {error && (
          <div className="border-t border-slate-200 px-3 py-3">
            <Alert>{error}</Alert>
          </div>
        )}
      </form>
    </section>
  );
}
