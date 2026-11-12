import type { NextConfig } from "next";

const staticExport = process.env.FASST_STATIC_EXPORT === "1";

const turbopack: NextConfig["turbopack"] = {
  rules: {
    "*.css": {
      loaders: ["@tailwindcss/turbopack"],
      as: "*.css",
    },
  },
};

const nextConfig: NextConfig = staticExport
  ? { output: "export", trailingSlash: true, turbopack }
  : {
      cacheComponents: true,
      turbopack,
      async redirects() {
        return [
          { source: "/", destination: "/login", permanent: false },
          { source: "/daftar/:token", destination: "/daftar?token=:token", permanent: false },
        ];
      },
      async rewrites() {
        const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
        return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
      },
    };

export default nextConfig;
