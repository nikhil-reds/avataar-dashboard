import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { OG_BASE, OG_IMAGE, SITE_URL } from "@/lib/siteMetadata";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * App-wide defaults. Both halves of the app inherit these: the shopper-facing
 * avatar at `/` and the admin console under `/admin`, which narrows them further
 * in its own layout.
 *
 * `title.template` applies to child segments only, so `title.default` is what the
 * root itself renders.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Trifast Global · AI Video Agent",
    template: "%s · Trifast Global",
  },
  description:
    "Trifast Global's AI video agent — ask a live avatar about any fastener: specifications, materials, stock and lead times.",
  applicationName: "Trifast AI Video Agent",
  generator: "Next.js",
  keywords: [
    "Trifast",
    "fasteners",
    "AI avatar",
    "product assistant",
    "live avatar",
  ],
  openGraph: {
    ...OG_BASE,
    url: "/",
    title: "Trifast Global · AI Video Agent",
    description:
      "Ask a live avatar about any fastener: specifications, materials, stock and lead times.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trifast Global · AI Video Agent",
    description:
      "Ask a live avatar about any fastener: specifications, materials, stock and lead times.",
    images: [OG_IMAGE.url],
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

// `themeColor` belongs on the viewport export — the `metadata` field for it was
// deprecated in Next 14. The two values match the light and dark page grounds, so
// mobile browser chrome does not clash with the app.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1420" },
  ],
};

// Runs synchronously while the browser parses the HTML, so the stored theme is
// applied before the first paint (no light-then-dark flash on reload).
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* `overflow-x-hidden` is a backstop, not the fix — any page that needs it is
          a bug. The responsive verification checks scrollWidth per route. */}
      <body className="min-h-full overflow-x-hidden bg-[var(--background)] text-zinc-900 dark:text-zinc-100 transition-colors">
        {children}
      </body>
    </html>
  );
}
