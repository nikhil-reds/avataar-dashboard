import React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

/**
 * Returns a phone-sized screen from a detail panel to the list it came from.
 *
 * Below `md` the master/detail pages show one or the other rather than stacking a
 * detail panel under a list hundreds of rows tall. From `md` up both are visible,
 * so this link has nothing to do and hides itself.
 */
export function BackToList({ href, label = 'Back to list' }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      className="md:hidden inline-flex items-center gap-1.5 self-start -ml-1 px-2 py-2 min-h-11 text-[12.5px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </Link>
  );
}
