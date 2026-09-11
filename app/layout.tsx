import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "../components/layout/Sidebar";
import { TAB_DEFINITIONS } from "../data/mockData";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rubenius · Avatar Commerce Admin",
  description:
    "Admin console for the avatar commerce pipeline: catalogue, ingest, renders and memory.",
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
      <body className="min-h-full">
        <div className="flex min-h-screen bg-[var(--background)] text-zinc-900 dark:text-zinc-100 transition-colors">
          {/* Persistent across route changes — the layout does not remount. */}

          <main className="flex-1 min-w-0 flex flex-col">{children}</main>
        </div>
      </body>
    </html>
  );
}
