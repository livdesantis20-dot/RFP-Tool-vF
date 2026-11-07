import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/WASM-heavy packages are loaded from node_modules at runtime rather than bundled.
  serverExternalPackages: ["@electric-sql/pglite", "unpdf"],
};

export default nextConfig;
