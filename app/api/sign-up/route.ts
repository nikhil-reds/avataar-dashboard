import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/password';

export async function POST(request: Request) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, email, password } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Please provide your name.' }, { status: 400 });
  }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ error: 'Please provide a password (at least 6 characters).' }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        passwordHash: hashedPassword,
        role: 'OPERATOR',
      }
    });

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    await prisma.$transaction([
      prisma.userSession.create({
        data: { userId: user.id, token: sessionToken, ipAddress: clientIp, userAgent, expiresAt },
      }),
      prisma.signInLog.create({
        data: { email: normalizedEmail, userId: user.id, status: 'SUCCESS', ipAddress: clientIp, userAgent },
      }),
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    ]);

    const response = NextResponse.json({
      success: true,
      message: 'Sign up successful',
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
    console.error('[Sign-Up Route Error]:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during sign up. Please try again.' },
      { status: 500 }
    );
  }
}
