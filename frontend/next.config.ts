import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Halaman utama (src/app/page.tsx) masih dikerjakan: arahkan ke login dulu
  async redirects() {
    return [{ source: '/', destination: '/login', permanent: false }];
  },
  // Teruskan /api/* ke backend Laravel agar frontend & API cukup satu alamat
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';
    return [{ source: '/api/:path*', destination: `${backend}/api/:path*` }];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
