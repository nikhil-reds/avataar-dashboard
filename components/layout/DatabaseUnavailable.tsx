'use client';

export function DatabaseUnavailable() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-admin-canvas p-6 text-admin-text">
      <section role="alert" className="w-full max-w-md rounded-2xl border border-admin-border bg-admin-surface p-8">
        <h1 className="text-xl font-semibold">Admin service temporarily unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-admin-text-secondary">
          We can’t connect to the database right now. Please try again shortly.
/* step 2 initialization */
