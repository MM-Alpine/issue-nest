import { Role } from '@prisma/client';
import { z } from 'zod';

export const CreateProjectBody = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    key: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z][A-Z0-9]{1,9}$/, 'Key must be 2–10 letters or digits and start with a letter'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description must be at most 1000 characters')
      .nullish(),
  })
  .strict();
export type CreateProjectBody = z.infer<typeof CreateProjectBody>;

export const AddMemberBody = z
  .object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    role: z
      .nativeEnum(Role, { errorMap: () => ({ message: 'Expected one of MAINTAINER, MEMBER' }) })
      .default(Role.MEMBER),
  })
  .strict();
export type AddMemberBody = z.infer<typeof AddMemberBody>;
