/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/webp"],
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
