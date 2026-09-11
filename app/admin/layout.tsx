import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TAB_DEFINITIONS } from "@/data/mockData";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rubenius · Avatar Commerce Admin",
  description:
    "Admin console for the avatar commerce pipeline: catalogue, ingest, renders and memory.",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[oklch(0.985_0.003_90)] dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors">
      <Sidebar tabs={TAB_DEFINITIONS} />
      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
