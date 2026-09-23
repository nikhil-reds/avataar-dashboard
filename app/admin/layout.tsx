import React from "react";
import type { Metadata } from "next";
import { AdminShell } from '@/components/layout/AdminShell';
import { TAB_DEFINITIONS } from '@/data/navigation';
import { getNavBadges } from '@/lib/dashboard';
import { OG_BASE, OG_IMAGE } from '@/lib/siteMetadata';
import type { TabId } from '@/types';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Admin defaults. The template replaces the root one for everything under
 * `/admin`, so an operator with several tabs open can tell the console apart from
 * the shopper-facing avatar at a glance.
 *
 * Indexing is off across the whole section: this is an internal console with no
 * public content, and there is nothing here that belongs in search results.
 */
export const metadata: Metadata = {
  title: {
    default: "Admin console",
    template: "%s · Trifast Admin",
  },
  description:
    "Admin console for the avatar commerce pipeline: catalogue, ingest, renders and memory.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  openGraph: { ...OG_BASE, title: "Trifast Admin console", url: "/admin" },
  twitter: {
    card: "summary_large_image",
    title: "Trifast Admin console",
    images: [OG_IMAGE.url],
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect('/sign-in');
  const badges = await getNavBadges();

  const counts: Partial<Record<TabId, number>> = {
    conversations: badges.conversations,
    catalogue: badges.skusInReview,
    ingest: badges.ingestJobs,
  };

  const tabs = TAB_DEFINITIONS.map((tab) => ({
    ...tab,
    badge: counts[tab.id] ? String(counts[tab.id]) : '',
  }));

  return <AdminShell tabs={tabs} user={user}>{children}</AdminShell>;
}
