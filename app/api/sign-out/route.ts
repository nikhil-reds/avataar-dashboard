import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  const token = (await cookies()).get('auth_token')?.value;
  if (token) {
    await prisma.userSession.updateMany({
      where: { token, invalidatedAt: null },
      data: { invalidatedAt: new Date() },
    });
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set('auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
