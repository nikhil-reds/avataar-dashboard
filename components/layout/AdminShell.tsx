'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';

import { Sidebar } from './Sidebar';
import type { NavTab } from '../../types';

/**
 * Lets the page-level Header open the navigation drawer.
 *
 * Header is rendered by each page rather than by the admin layout, so the
 * hamburger and the drawer state are not in the same subtree. A context is the
 * cheapest bridge; the alternative is hoisting Header into the layout, which
 * every page currently parameterises differently.
 *
 * Null outside the admin shell, so Header simply renders no hamburger there.
 */
const NavDrawerContext = createContext<{ open: () => void } | null>(null);

export function useNavDrawer() {
  return useContext(NavDrawerContext);
}

interface AdminShellProps {
  tabs: NavTab[];
  children: React.ReactNode;
}

/**
 * Client wrapper holding the drawer's open state.
 *
 * It exists so `app/admin/layout.tsx` can stay a server component and keep
 * awaiting `getNavBadges()`.
 */
export function AdminShell({ tabs, children }: AdminShellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Tapping a nav link should navigate *and* dismiss; so should browser back while
  // the drawer is open. Adjusted during render rather than in an effect — React
  // re-runs the render immediately with the new state and never paints the stale
  // open drawer, where an effect would show it for a frame.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    // Without this the page scrolls behind the drawer on touch.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const drawer = useMemo(() => ({ open: () => setIsOpen(true) }), []);

  return (
    <NavDrawerContext.Provider value={drawer}>
      <div className="flex min-h-screen bg-[var(--background)] text-zinc-900 dark:text-zinc-100 transition-colors">
        <Sidebar tabs={tabs} isOpen={isOpen} onClose={() => setIsOpen(false)} />

        <main className="flex-1 min-w-0 flex flex-col">{children}</main>
      </div>
    </NavDrawerContext.Provider>
  );
}
