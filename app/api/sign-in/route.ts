import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
  }

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Please provide a password.' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  try {
    // 1. Find or create user record using standard User model
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          role: normalizedEmail.includes('admin') ? 'ADMIN' : 'OPERATOR',
        },
      });
    }

    // 2. Generate Session Token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // 3. Attempt DB session/log creation safely if models exist on Prisma Client
    try {
      const p = prisma as unknown as Record<string, { create: (args: unknown) => Promise<unknown> }>;
      if (p.userSession && typeof p.userSession.create === 'function') {
        await p.userSession.create({
          data: {
            userId: user.id,
            token: sessionToken,
            ipAddress: clientIp,
            userAgent,
            expiresAt,
          },
        });
      }
      if (p.signInLog && typeof p.signInLog.create === 'function') {
        await p.signInLog.create({
          data: {
            email: normalizedEmail,
            userId: user.id,
            status: 'SUCCESS',
            ipAddress: clientIp,
            userAgent,
          },
        });
      }
    } catch (dbErr) {
      console.warn('[Sign-In Route DB Log Warning]:', dbErr);
    }

    // 4. Create Response with Auth Cookie
    const response = NextResponse.json({
      success: true,
      message: 'Sign in successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token: sessionToken,
    });

    response.cookies.set({
      name: 'auth_token',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    return response;
  } catch (error) {
    console.error('[Sign-In Route Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during sign in. Please try again.' },
      { status: 500 }
    );
  }
}
