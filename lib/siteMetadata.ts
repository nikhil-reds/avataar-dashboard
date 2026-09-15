import type { Metadata } from 'next';

/**
 * Shared pieces of the metadata tree.
 *
 * Next replaces a nested metadata object wholesale rather than deep-merging it:
 * a child segment that sets `openGraph` drops every field the parent had set,
 * image included. So anything a child needs to keep has to be spread back in,
 * and it lives here rather than being retyped per route.
 */

// Absolute URLs in Open Graph and canonical tags need a real origin. Set
// NEXT_PUBLIC_SITE_URL in the deployed environment; the localhost fallback keeps
// dev and `next build` working without baking a guessed domain into the output.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const SITE_NAME = 'Trifast Global';

export const OG_IMAGE = {
  url: '/og-image.png',
  width: 1200,
  height: 630,
  alt: SITE_NAME,
} as const;

/** Fields every Open Graph card in the app shares. */
export const OG_BASE = {
  type: 'website',
  siteName: SITE_NAME,
  locale: 'en_GB',
  images: [OG_IMAGE],
} satisfies Metadata['openGraph'];
