import type { Metadata } from "next";

import { HomeExperience } from "@/components/home/HomeExperience";
import { OG_BASE } from "@/lib/siteMetadata";

// A server component so it can export metadata — the interactive part lives in
// AvatarPanel, which is the only piece that needs to run on the client.
export const metadata: Metadata = {
  title: "Video Agent",
  description:
    "Start a live conversation with the Trifast avatar. Ask about any fastener — specifications, materials, stock and lead times.",
  alternates: { canonical: "/" },
  // Spread rather than replaced: a bare object here would drop the root's OG image.
  openGraph: {
    ...OG_BASE,
    url: "/",
    title: "Trifast Global · Video Agent",
    description:
      "Start a live conversation with the Trifast avatar. Ask about any fastener — specifications, materials, stock and lead times.",
  },
};

export default function VideoAgent() {
  return <HomeExperience />;
}
