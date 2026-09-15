'use client';

import React, { useCallback, useLayoutEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function resolveStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage can be unavailable (private mode, blocked cookies)
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Light / dark switch for the whole app.
 *
 * The active theme lives in a `data-theme` attribute on <html>, which every
 * `dark:` utility in the app keys off (see the @custom-variant in globals.css),
 * so a single click repaints the navbar, sidebar and every panel at once.
 *
 * Both icons are always rendered and swapped with CSS rather than with React
 * state — the theme isn't known during SSR, so anything state-driven here would
 * mismatch on hydration.
 */
export const ThemeToggle: React.FC = () => {
  // The inline script in the root layout sets the attribute before paint, but
  // React's Strict Mode remount in development wipes attributes it doesn't
  // manage from JSX. Re-applying here is a no-op in production.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', resolveStoredTheme());
  }, []);

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    const next: Theme =
      root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference just won't survive a reload
    }
  }, []);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title="Toggle light / dark mode"
      aria-label="Toggle light / dark mode"
      className="flex items-center justify-center gap-2 text-[12px] font-semibold text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white active:scale-[0.98] transition-all w-11 h-11 sm:w-auto sm:h-auto sm:px-3 sm:py-2 rounded-xl sm:rounded-lg cursor-pointer"
    >
      <Moon className="w-4 h-4 sm:w-3.5 sm:h-3.5 dark:hidden" />
      <Sun className="w-4 h-4 sm:w-3.5 sm:h-3.5 hidden dark:block" />
      <span className="hidden sm:inline dark:hidden">Dark</span>
      <span className="hidden sm:dark:inline">Light</span>
    </button>
  );
};
