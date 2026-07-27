import { z } from 'zod';

export const SignupBody = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(200, 'Password must be at most 200 characters'),
  })
  .strict();
export type SignupBody = z.infer<typeof SignupBody>;

export const LoginBody = z
  .object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address'),
    password: z.string().min(1, 'Password is required'),
  })
  .strict();
export type LoginBody = z.infer<typeof LoginBody>;
