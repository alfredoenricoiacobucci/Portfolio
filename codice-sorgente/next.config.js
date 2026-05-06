/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1200, 1920, 2560],
    imageSizes: [256, 384, 640, 1024],
    minimumCacheTTL: 31536000,
  },
  // Compressione gzip automatica
  compress: true,
  // Bundle contenuti/ into the serverless function so files are available
  // at runtime on Vercel without a separate copy step in public/
  outputFileTracingIncludes: {
    "/api/projects/[...path]": ["./contenuti/**/*"],
  },
  // Escludi foto/video dalle page functions — servite via /api/projects, non SSR
  // Le dimensioni immagini vengono lette solo se i file sono disponibili (fallback 3:2)
  outputFileTracingExcludes: {
    "/artwork": ["./contenuti/art/**/*", "./contenuti/pro/**/*", "./contenuti/about/**/*"],
    "/professional": ["./contenuti/art/**/*", "./contenuti/pro/**/*", "./contenuti/about/**/*"],
    "/": ["./contenuti/art/**/*", "./contenuti/pro/**/*", "./contenuti/about/**/*"],
  },
  // Serve immagini da contenuti/ via API route con cache CDN
  async rewrites() {
    return [
      {
        source: "/projects/:path*",
        destination: "/api/projects/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
