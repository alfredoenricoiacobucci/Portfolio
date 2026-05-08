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
  // Le immagini sono in public/projects/ (copiate dal build command in vercel.json),
  // servite direttamente dalla CDN senza funzioni serverless.
  // Le pagine SSR leggono solo contenuti.json e stringhe.txt (~130KB totali).
  outputFileTracingIncludes: {
    "/artwork": ["./contenuti/contenuti.json", "./contenuti/stringhe.txt"],
    "/professional": ["./contenuti/contenuti.json", "./contenuti/stringhe.txt"],
    "/": ["./contenuti/contenuti.json", "./contenuti/stringhe.txt"],
  },
};

module.exports = nextConfig;
