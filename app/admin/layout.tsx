import React from "react";
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
  return <>{children}</>;
}
