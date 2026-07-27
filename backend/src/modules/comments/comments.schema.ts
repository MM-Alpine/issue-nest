import { z } from 'zod';

export const CreateCommentBody = z
  .object({
    // Trim BEFORE the length check, so "   " fails just like "" does.
    body: z
      .string()
      .trim()
      .min(1, 'Comment cannot be empty')
      .max(5000, 'Comment must be at most 5000 characters'),
  })
  .strict();
export type CreateCommentBody = z.infer<typeof CreateCommentBody>;
