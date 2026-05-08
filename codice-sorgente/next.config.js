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
  // Includi solo metadati nelle page functions (pochi KB, non le immagini da 440MB)
  outputFileTracingIncludes: {
    "/artwork": ["./contenuti/contenuti.json", "./contenuti/stringhe.txt"],
    "/professional": ["./contenuti/contenuti.json", "./contenuti/stringhe.txt"],
    "/": ["./contenuti/contenuti.json", "./contenuti/stringhe.txt"],
  },
  // Le immagini sono servite come file statici da public/projects (symlink → contenuti/)
};

module.exports = nextConfig;
