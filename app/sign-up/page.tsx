'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Please enter a password with at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to sign up.');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin');
      }, 500);
    } catch {
      setError('Unable to connect to server. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="relative isolate flex min-h-dvh w-full flex-col bg-home-background text-home-foreground [color-scheme:dark]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <Image src="/figma/avtaar-home/background.png" alt="" fill sizes="100vw" preload className="object-cover object-[60%_center] opacity-15" />
        <div className="absolute inset-0 bg-linear-to-b from-home-background/40 via-home-background/35 to-home-background/95" />
        <div className="absolute -bottom-64 left-1/2 h-96 w-full max-w-3xl -translate-x-1/2 rounded-full bg-home-accent/30 blur-[100px]" />
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <section aria-labelledby="sign-up-title" className="w-full max-w-[460px] overflow-hidden rounded-3xl border border-white/15 bg-home-background-raised/90 shadow-[0_32px_100px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <header className="border-b border-white/10 px-6 pb-7 pt-8 sm:px-10 sm:pt-10">
            <div className="mx-auto mb-8 flex w-fit justify-center rounded-2xl bg-white p-4">
              <Image
                src="/TR_logo_alpha.png"
                alt="TR Fastenings"
                width={2106}
                height={2016}
                preload
                className="h-24 w-auto object-contain"
              />
            </div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-home-accent">Operator sign up</p>
            <h1 id="sign-up-title" className="text-3xl font-semibold tracking-tight sm:text-[34px]">Create an account.</h1>
            <p className="mt-3 text-sm leading-6 text-home-status">Sign up to manage your digital guide, maintain product knowledge, and review conversations.</p>
          </header>

          <div className="px-6 py-7 sm:px-10 sm:py-8">
            {error && (
              <div id="sign-up-error" role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">
                <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-3 text-sm text-emerald-200">
                <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
                <span>Account created. Opening your dashboard…</span>
              </div>
            )}

            <form onSubmit={handleSubmit} aria-busy={isLoading} aria-describedby={error ? 'sign-up-error' : undefined} className="space-y-5">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-home-subtext">Full Name</label>
                <div className="relative">
                  <User aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-home-status" />
                  <input id="name" name="name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required disabled={isLoading || success}
                    className="h-12 w-full rounded-xl border border-white/15 bg-white/5 pl-11 pr-4 text-base text-white outline-none transition-colors placeholder:text-home-status/70 focus:border-home-accent focus:ring-2 focus:ring-home-accent/25 disabled:opacity-60" />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-home-subtext">Email address</label>
                <div className="relative">
                  <Mail aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-home-status" />
                  <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required disabled={isLoading || success}
                    className="h-12 w-full rounded-xl border border-white/15 bg-white/5 pl-11 pr-4 text-base text-white outline-none transition-colors placeholder:text-home-status/70 focus:border-home-accent focus:ring-2 focus:ring-home-accent/25 disabled:opacity-60" />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-home-subtext">Password</label>
                <div className="relative">
                  <Lock aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-home-status" />
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password" required disabled={isLoading || success}
                    className="h-12 w-full rounded-xl border border-white/15 bg-white/5 pl-11 pr-12 text-base text-white outline-none transition-colors placeholder:text-home-status/70 focus:border-home-accent focus:ring-2 focus:ring-home-accent/25 disabled:opacity-60" />
                  <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute right-1 top-1 flex size-10 cursor-pointer items-center justify-center rounded-lg text-home-status hover:text-white focus-visible:outline-2 focus-visible:outline-home-accent">
                    {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={isLoading || success} className="mt-2 flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-home-accent px-4 py-3 text-sm font-semibold text-home-background shadow-[0_6px_24px_rgba(0,133,255,0.2)] transition-colors hover:bg-[#339dff] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-home-accent disabled:cursor-wait disabled:opacity-65">
                {success ? <><CheckCircle2 aria-hidden="true" className="size-4" /><span>Account created</span></> : isLoading ? <><Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /><span>Creating account…</span></> : <><span>Sign up</span><ArrowRight aria-hidden="true" className="size-4" /></>}
              </button>
            </form>
            <p className="mt-6 text-center text-xs leading-5 text-home-status">
              Already have an account? <Link href="/sign-in" className="text-home-accent hover:underline">Sign in here</Link>
            </p>
          </div>
        </section>
      </div>
      <footer className="px-6 pb-6 text-center text-[10px] uppercase tracking-[0.24em] text-home-status">Engineering. <span className="text-home-accent">Connected.</span></footer>
    </main>
  );
}
