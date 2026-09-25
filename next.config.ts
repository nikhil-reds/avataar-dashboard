import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    ignoreIssue: [
      {
        path: '**/app/generated/prisma/**',
      },
    ],
  },
};

export default nextConfig;
