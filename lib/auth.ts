import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';

export interface SessionUser {
  name: string | null;
  email: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return null;
  const session = await prisma.userSession.findFirst({
    where: { token, invalidatedAt: null, expiresAt: { gt: new Date() } },
    select: { user: { select: { name: true, email: true } } },
  });
  return session?.user ?? null;
}
