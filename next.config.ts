import type { NextConfig } from "next";

// Allow HTTPS requests to external APIs in local dev
// (handles environments with corporate proxies or missing root CAs)
if (!process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
