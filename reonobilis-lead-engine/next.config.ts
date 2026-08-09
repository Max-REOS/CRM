import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native module (better-sqlite3) and a browser-automation library
  // (playwright) must not be bundled by the server compiler — they're
  // resolved from node_modules at runtime instead.
  serverExternalPackages: ['better-sqlite3', 'playwright'],
  // This project lives nested inside the CRM repo (see README), which has
  // its own lockfile one level up — pin the workspace root so Turbopack
  // doesn't have to guess it.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
