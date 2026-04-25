/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Abilita ottimizzazione immagini Next.js
    formats: ["image/webp"],
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [128, 256, 384],
  },
  // Compressione gzip automatica
  compress: true,
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
