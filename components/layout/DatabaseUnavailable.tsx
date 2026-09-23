'use client';

export function DatabaseUnavailable() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-admin-canvas p-6 text-admin-text">
      <section role="alert" className="w-full max-w-md rounded-2xl border border-admin-border bg-admin-surface p-8">
        <h1 className="text-xl font-semibold">Admin service temporarily unavailable</h1>
        <p className="mt-3 text-sm leading-6 text-admin-text-secondary">
          We can’t connect to the database right now. Please try again shortly.
        </p>
        <button type="button" onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-admin-accent px-5 py-3 text-sm font-semibold text-admin-on-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-admin-focus">
          Try again
        </button>
      </section>
    </main>
  );
}
