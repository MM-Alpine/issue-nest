import { Prisma } from '@prisma/client';
import { conflict, unauthorized } from '../../lib/errors';
import { signAccessToken } from '../../lib/jwt';
import { hashPassword, verifyPassword } from '../../lib/password';
import { prisma } from '../../lib/prisma';
import type { LoginBody, SignupBody } from './auth.schema';

const accountUserSelect = { id: true, name: true, email: true, createdAt: true } as const;

/**
 * A real bcrypt hash of a value nobody can log in with. Comparing against it when the
 * email is unknown keeps login timing broadly uniform, so the endpoint cannot be used
 * as an account-existence oracle.
 */
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.9YQ1YyO1zM4z2vI0uJ0v0J7l1eDS';

const invalidCredentials = () =>
  unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

export async function signup(input: SignupBody) {
  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
      select: accountUserSelect,
    });
    return { user, accessToken: signAccessToken(user.id) };
  } catch (error) {
    // Rely on the unique index rather than a read-then-write check, which would be racy.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw conflict('An account with this email already exists', 'EMAIL_ALREADY_EXISTS');
    }
    throw error;
  }
}

export async function login(input: LoginBody) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user) {
    await verifyPassword(input.password, DUMMY_HASH);
    throw invalidCredentials();
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) throw invalidCredentials();

  return {
    user: { id: user.id, name: user.name, email: user.email },
    accessToken: signAccessToken(user.id),
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: accountUserSelect });
  if (!user) throw unauthorized();
  return user;
}
