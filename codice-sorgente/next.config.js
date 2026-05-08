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
  // Le pagine SSR leggono SOLO contenuti.json e stringhe.txt (piccoli).
  // Le immagini vengono servite dalla API route che ha il bundle completo.
  outputFileTracingIncludes: {
    "/api/projects/[...path]": ["./contenuti/**/*"],
    "/": ["./contenuti/contenuti.json", "./contenuti/stringhe.txt"],
    "/artwork": ["./contenuti/contenuti.json", "./contenuti/stringhe.txt"],
    "/professional": ["./contenuti/contenuti.json", "./contenuti/stringhe.txt"],
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
